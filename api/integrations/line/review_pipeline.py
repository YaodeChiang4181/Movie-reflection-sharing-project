import os
import re
import urllib.parse
from django.utils import timezone
from linebot.models import (
    FlexSendMessage, TextSendMessage, QuickReply, QuickReplyButton, MessageAction
)
from api.models import Review, Tag, LineBotState
from api.domains.gamification.services import add_user_experience
from api.utils.tmdb import get_or_create_movie, find_disambiguation_candidates
from .flex_templates import (
    get_stage_one_rating_flex, get_stage_two_completed_flex
)

def extract_quick_rating_intent(text):
    """
    解析使用者的自然評分意圖 (零 Emoji，高容錯)
    支援情境：
    1. '沙丘 5' / '沙丘 5星' / '沙丘 5顆星' / '沙丘 5分'
    2. '給 奧本海默 4星'
    3. '阿凡達 打 5 星'
    4. 傳統格式相容：'#心得\n電影：沙丘\n評分：5\n心得：太震撼了'
    """
    if not text or not isinstance(text, str):
        return None, None, None

    clean = text.strip()

    # 排除系統命令與保留字，避免誤觸
    if clean.startswith(('/', '／', '查 ', '搜尋 ', '近期活動', '影迷名片', '漂流瓶', '我的名片')):
        return None, None, None

    # 相容傳統多行 #心得 格式
    if clean.startswith(('#心得', '＃心得')):
        movie_match = re.search(r'電影：([^\n]+)', clean)
        rating_match = re.search(r'評分：(\d+)', clean)
        content_match = re.search(r'心得：(.*)', clean, re.DOTALL)
        tag_match = re.search(r'標籤：([^\n]+)', clean)

        if movie_match and rating_match:
            movie_title = movie_match.group(1).strip()
            score = min(max(int(rating_match.group(1).strip()), 1), 5)
            content = content_match.group(1).strip() if content_match else ""
            tags = []
            if tag_match:
                tag_raw = tag_match.group(1).replace('(選填)', '').replace('（選填）', '').strip()
                if tag_raw and tag_raw not in ['無', '略過', '沒有']:
                    tags = [t.strip().replace('#', '') for t in re.split(r'[\s#;,]+', tag_raw) if t.strip()]

            is_spoiler = any(k in clean for k in ['#防雷', '#有雷', '【防雷】', '[防雷]', '#劇透', '爆雷'])
            extra = {
                "content": content,
                "tags": tags,
                "is_spoiler": is_spoiler
            }
            return movie_title, score, extra

    # 自然評分正則比對：片名 + 評分數字 (1~5) + 選填單位
    pattern = r'^(?:給\s*)?([^\d\n\u2605\u2606#]+?)\s*(?:(?:打|評)\s*)?([1-5])\s*(?:星|顆星|分)?$'
    m = re.match(pattern, clean)
    if m:
        raw_title = m.group(1).strip()
        # 移除結尾可能殘留的修飾字
        movie_title = re.sub(r'[\s]+(?:打|評)$', '', raw_title).strip()
        score = int(m.group(2))
        if movie_title and not movie_title.isdigit():
            return movie_title, score, None

    return None, None, None


def handle_stage_one_rating(user, line_user_id, movie_title, rating, extra_data=None):
    """
    第一階段：極速評星收錄與狀態鎖定
    """
    # 檢查是否有同名歧義版本（例如動漫 vs 真人影集）
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', movie_title)
    if not year_match:
        candidates = find_disambiguation_candidates(movie_title)
        if len(candidates) > 1:
            qr_buttons = []
            for cand in candidates[:3]:
                type_label = cand.get('media_type_label', '作品')
                year_str = cand.get('year', '')
                btn_label = f"{year_str} {type_label}".strip()[:20]
                action_text = f"{cand['title']} {year_str} {rating}星"
                qr_buttons.append(QuickReplyButton(action=MessageAction(label=btn_label, text=action_text)))
                
            msg_text = f"檢索到多部《{movie_title}》，請點選欲評分的作品版本："
            return TextSendMessage(text=msg_text, quick_reply=QuickReply(items=qr_buttons))

    movie, _, tmdb_genres = get_or_create_movie(movie_title)

    # 建立或更新評價 (防止重複評價洗經驗)
    review = Review.objects.filter(user=user, movie=movie).first()
    is_new = False

    if not review:
        review = Review.objects.create(
            user=user,
            movie=movie,
            rating=rating,
            content="",
            source='line'
        )
        is_new = True
        # 標籤自動收錄片名與 TMDB 類型
        movie_tag, _ = Tag.objects.get_or_create(name=movie.title)
        review.tags.add(movie_tag)
        for g in tmdb_genres:
            if g and g != movie.title:
                gtag, _ = Tag.objects.get_or_create(name=g)
                review.tags.add(gtag)
    else:
        review.rating = rating
        review.save()

    # 首次評分給予經驗值
    if is_new:
        add_user_experience(user, 10)

    # 若單次訊息即附帶完整心得 (例如傳統 #心得 模式)，直接一併完成
    if extra_data and extra_data.get("content"):
        review.content = extra_data.get("content", "")
        review.is_spoiler = extra_data.get("is_spoiler", False)
        for t in extra_data.get("tags", []):
            if t:
                tag_obj, _ = Tag.objects.get_or_create(name=t)
                review.tags.add(tag_obj)
        review.save()
        user_exp = add_user_experience(user, 15)

        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        movie_url = f"{frontend_url}/movies/{movie.id}"
        flex_dict = get_stage_two_completed_flex(review, movie.title, user_exp, movie_url)
        return FlexSendMessage(
            alt_text=f"心得已歸檔：《{movie.title}》",
            contents=flex_dict
        )

    # 寫入狀態機 (等待第二階段文字回覆)
    state_record, _ = LineBotState.objects.get_or_create(line_user_id=line_user_id)
    state_record.state = "WAITING_FOR_REVIEW_CONTENT"
    state_record.data = {
        "review_id": review.id,
        "movie_id": movie.id,
        "movie_title": movie.title,
        "rating": rating,
        "timestamp": timezone.now().timestamp()
    }
    state_record.save()

    # 準備 LIFF 深度編輯抽屜網址
    frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
    liff_base_url = os.getenv('LIFF_BASE_URL', f"{frontend_url}/liff/review-form")
    liff_deep_edit_url = f"{liff_base_url}?review_id={review.id}&title={urllib.parse.quote(movie.title)}&rating={rating}"

    flex_dict = get_stage_one_rating_flex(movie, rating, liff_deep_edit_url)

    # 純文字 Quick Reply (零 Emoji)
    quick_reply = QuickReply(items=[
        QuickReplyButton(action=MessageAction(label="標記為防雷心得", text="#防雷 ")),
        QuickReplyButton(action=MessageAction(label="完成並保留評分", text="完成"))
    ])

    return FlexSendMessage(
        alt_text=f"評分已收錄：《{movie.title}》{rating}.0/5.0",
        contents=flex_dict,
        quick_reply=quick_reply
    )


def handle_stage_two_content(user, state_record, text):
    """
    第二階段：自然語言內文補齊與心得升級
    """
    clean_text = text.strip()

    # 保留指令退出檢查 (不刪除已記錄的評分)
    if clean_text in ['完成', '結束', '取消', '不用了', '略過', '保留']:
        state_record.state = ""
        state_record.data = {}
        state_record.save()
        return TextSendMessage(text="已保留評分紀錄。")

    data = state_record.data or {}
    review_id = data.get("review_id")
    movie_title = data.get("movie_title", "")

    review = Review.objects.filter(id=review_id, user=user).first()
    if not review:
        state_record.state = ""
        state_record.data = {}
        state_record.save()
        return TextSendMessage(text="查無評分紀錄，請重新輸入片名評分。")

    # 1. 檢驗防雷標記
    is_spoiler = False
    content_body = clean_text
    spoiler_markers = ['#防雷', '#有雷', '【防雷】', '[防雷]', '#劇透', '【劇透】']
    for marker in spoiler_markers:
        if marker in content_body:
            is_spoiler = True
            content_body = content_body.replace(marker, '').strip()

    # 2. 解析 Hashtag
    raw_tags = re.findall(r'#([^\s#]+)', clean_text)
    for tag_name in raw_tags:
        if tag_name not in ['防雷', '有雷', '劇透']:
            tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
            review.tags.add(tag_obj)

    # 3. 儲存內文與防雷標記 (移除 Hashtag 使內文更乾淨純粹)
    cleaned_without_tags = re.sub(r'#[^\s#]+', '', content_body).strip()
    review.content = cleaned_without_tags if cleaned_without_tags else content_body
    review.is_spoiler = is_spoiler
    review.save()

    # 4. 追加長文經驗值
    user_exp = add_user_experience(user, 15)

    # 5. 清空對話狀態機
    state_record.state = ""
    state_record.data = {}
    state_record.save()

    # 6. 回傳第二階段雜誌風心得卡
    frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
    movie_url = f"{frontend_url}/movies/{review.movie.id}"
    flex_dict = get_stage_two_completed_flex(review, movie_title or review.movie.title, user_exp, movie_url)

    return FlexSendMessage(
        alt_text=f"心得已歸檔：《{review.movie.title}》",
        contents=flex_dict
    )
