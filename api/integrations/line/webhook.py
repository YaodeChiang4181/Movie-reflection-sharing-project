import os
import re
import random
import string
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import datetime
from django.utils.timezone import make_aware
import urllib.parse

from linebot import LineBotApi, WebhookHandler
from linebot.models import MessageEvent, TextMessage, TextSendMessage, FlexSendMessage, PostbackEvent, QuickReply, QuickReplyButton, MessageAction
from linebot.exceptions import InvalidSignatureError, LineBotApiError
from rest_framework_simplejwt.tokens import RefreshToken

from dotenv import load_dotenv

from api.models import User, Review, Movie, Event, UserProfile, OutsiderIdentity, LineBotState
from api.domains.gamification.services import add_user_experience
from api.utils.text_utils import normalize_movie_title
from .flex_templates import (
    get_exp_feedback_flex, get_review_carousel_flex, get_events_list_flex, 
    get_event_success_flex, get_auto_login_flex, get_speed_rate_genres_flex, 
    get_speed_rate_movies_carousel_flex, get_rules_flex, get_speed_rate_score_flex
)

load_dotenv()
line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN', ''))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET', ''))

def generate_random_campus_id():
    while True:
        campus_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
        if not User.objects.filter(campus_id=campus_id).exists():
            return campus_id

@csrf_exempt
def line_webhook(request):
    if request.method == 'POST':
        signature = request.headers.get('X-Line-Signature', '')
        body = request.body.decode('utf-8')
        
        try:
            handler.handle(body, signature)
        except InvalidSignatureError:
            return HttpResponseForbidden("Invalid signature")
            
        return HttpResponse('OK')
    return HttpResponseBadRequest('Method not allowed')

def clean_text_from_line(event):
    text = event.message.text
    if getattr(event.message, 'emojis', None):
        emojis = sorted(event.message.emojis, key=lambda x: x.index, reverse=True)
        for emoji in emojis:
            start = emoji.index
            end = emoji.index + emoji.length
            text = text[:start] + text[end:]
    
    text = ''.join(char for char in text if char.isprintable() or char == '\n')
    return text.strip()

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    if event.reply_token == '00000000000000000000000000000000' or event.reply_token == 'ffffffffffffffffffffffffffffffff':
        return

    text = clean_text_from_line(event)
    line_user_id = event.source.user_id
    
    try:
        profile = line_bot_api.get_profile(line_user_id)
        display_name = profile.display_name
    except:
        display_name = "LINE User"

    if text in ['/', '/規則', '／', '／規則']:
        flex_card = get_rules_flex()
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="影像製作所 Bot 指令規則", contents=flex_card))
        return

    if text.startswith('#綁定') or text.startswith('＃綁定'):
        parts = text.split()
        if len(parts) >= 3:
            username_input = parts[1]
            password = parts[2]
            
            target_user = None
            if '@' in username_input:
                outsider = OutsiderIdentity.objects.filter(email=username_input).first()
                if outsider:
                    target_user = outsider.user
            else:
                target_user = User.objects.filter(campus_id=username_input).first()
                
            if target_user and target_user.check_password(password):
                if target_user.line_user_id and target_user.line_user_id != line_user_id:
                    line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 此帳號已被其他 LINE 綁定！"))
                    return
                    
                old_user = User.objects.filter(line_user_id=line_user_id).first()
                if old_user and old_user.campus_id != target_user.campus_id:
                    # 將舊帳號的心得、留言、揪團活動等移轉給主帳號
                    old_user.reviews.update(user=target_user)
                    old_user.comments.update(user=target_user)
                    old_user.events.update(user=target_user)
                    
                    # 處理按讚紀錄 (避免 UniqueConstraint 衝突)
                    for vote in old_user.votes.all():
                        from django.db import IntegrityError
                        vote.user = target_user
                        try:
                            vote.save()
                        except IntegrityError:
                            # 如果主帳號已經對該篇心得按過讚，則刪除舊帳號的重複讚
                            vote.delete()
                            
                    # 處理打卡紀錄
                    for checkin in old_user.campaign_checkins.all():
                        from django.db import IntegrityError
                        checkin.user = target_user
                        try:
                            checkin.save()
                        except IntegrityError:
                            checkin.delete()
                    
                    # 合併經驗值
                    if hasattr(old_user, 'experience'):
                        from api.models import UserExperience
                        target_exp, _ = UserExperience.objects.get_or_create(user=target_user)
                        target_exp.exp += old_user.experience.exp
                        
                        # 重新計算等級 (每 100 經驗升一級)
                        target_exp.level = max(1, target_exp.exp // 100)
                        target_exp.save()
                        
                    # 最後刪除已經清空的幽靈舊帳號
                    old_user.delete()
                        
                target_user.line_user_id = line_user_id
                target_user.line_display_name = display_name
                target_user.save()
                
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"✅ 帳號綁定成功！歡迎回來，{target_user.username or target_user.campus_id}。"))
            else:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 帳號或密碼錯誤，請重新確認！"))
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="綁定格式錯誤，請參考範例 (中間要有空格，不需括號)：\n#綁定 a12345678 mypassword"))
        return

    user = User.objects.filter(line_user_id=line_user_id).first()
    if not user:
        campus_id = generate_random_campus_id()
        user = User.objects.create(
            campus_id=campus_id,
            line_user_id=line_user_id,
            line_display_name=display_name,
            username=display_name
        )
        
        random_nickname = f"User_{''.join(random.choices(string.ascii_letters + string.digits, k=6))}"
        UserProfile.objects.create(user=user, nickname=random_nickname)

    if text.startswith('#暱稱') or text.startswith('＃暱稱'):
        parts = text.split(maxsplit=1)
        if len(parts) >= 2:
            import unicodedata
            new_nickname = unicodedata.normalize('NFKC', parts[1].strip())
            
            if not re.match(r'^User_[A-Za-z0-9]{6}$', user.profile.nickname):
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 您已經設定過專屬暱稱了，每位使用者只能設定一次喔！"))
                return
                
            if len(new_nickname) > 50:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 暱稱太長囉，請限制在 50 個字元以內！"))
                return
                
            if UserProfile.objects.filter(nickname=new_nickname).exclude(user=user).exists():
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"❌ 暱稱「{new_nickname}」已經被其他人使用囉，換一個試試看吧！"))
                return
                
            user.profile.nickname = new_nickname
            user.profile.save()
            
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"✅ 暱稱設定成功！以後大家都會看到你是「{new_nickname}」囉！"))
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="暱稱設定格式錯誤，請參考範例 (中間要有空格，不需括號)：\n#暱稱 影迷小明"))
        return

    if text.startswith('#心得') or text.startswith('＃心得'):
        movie_match = re.search(r'電影：([^\n]+)', text)
        rating_match = re.search(r'評分：(\d+)', text)
        tag_match = re.search(r'標籤：([^\n]+)', text)
        content_match = re.search(r'心得：(.*)', text, re.DOTALL)
        
        if movie_match and rating_match and content_match:
            movie_title = movie_match.group(1).strip()
            rating = min(max(int(rating_match.group(1).strip()), 1), 5)
            content = content_match.group(1).strip()
            
            movie, _ = Movie.objects.get_or_create(title=movie_title, defaults={'release_year': timezone.now().year, 'director': 'Unknown'})
            
            existing_review = Review.objects.filter(user=user, movie=movie).first()
            if existing_review:
                existing_review.rating = rating
                existing_review.content = content
                existing_review.save()
                review = existing_review
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"✅ 已為您更新《{movie_title}》的心得內容！\n(註：重複評價不會再次獲得經驗值喔)"))
                return
            else:
                review = Review.objects.create(
                    user=user,
                    movie=movie,
                    rating=rating,
                    content=content,
                    source='line'
                )
            
            from api.models import Tag
            from api.utils.tmdb import fetch_movie_genres
            
            movie_tag, _ = Tag.objects.get_or_create(name=movie_title)
            review.tags.add(movie_tag)
            
            tags = []
            if tag_match:
                tag_text = tag_match.group(1).strip()
                tag_text = tag_text.replace('(選填)', '').replace('（選填）', '')
                if tag_text and tag_text not in ['無', '略過', '沒有']:
                    # 用 # 分割，並移除每個標籤中包含的空白和分號
                    raw_tags = tag_text.split('#')
                    for t in raw_tags:
                        import re
                        cleaned = re.sub(r'[\s;]', '', t)
                        if cleaned:
                            tags.append(cleaned)
                            
            # Automatically fetch and append TMDB genres
            tmdb_genres = fetch_movie_genres(movie_title)
            for genre in tmdb_genres:
                if genre not in tags:
                    tags.append(genre)
                            
            has_spoiler = False
            for tag_name in tags:
                if tag_name in ['爆雷', '有雷', '劇透', '雷']:
                    has_spoiler = True
                if tag_name != movie_title:
                    tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                    review.tags.add(tag_obj)
            
            if has_spoiler:
                review.is_spoiler = True
                review.save()
            
            user_exp = add_user_experience(user, 25)
            
            frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
            movie_url = f"{frontend_url}/movies/{movie.id}"
            
            flex_bubble = get_exp_feedback_flex(user, 25, user_exp.level, user_exp.exp, movie_url=movie_url)
            
            line_bot_api.reply_message(
                event.reply_token, 
                FlexSendMessage(alt_text="發布成功！經驗值增加", contents=flex_bubble)
            )
            return
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="心得格式錯誤，請參考範例 (不需打括號)：\n#心得\n電影：奧德賽\n評分：5\n標籤：#動作片\n心得：真的很好看！"))
            return
            
    # --- Stateful Search Logic ---
    state_record, _ = LineBotState.objects.get_or_create(line_user_id=line_user_id)
    user_state = state_record.state
    
    # 攔截關鍵指令，強制退出目前的狀態 (避免在輸入電影名稱時，按到選單按鈕變成輸入電影名稱)
    reserved_commands = ['寫心得', '發布感想', '影迷名片', '急速評星', '近期活動', '查', '快速查詢', '影評推薦', '取消']
    is_hash_cmd = any(text.startswith(c) for c in ['#心得', '＃心得', '#揪團', '＃揪團', '#綁定', '＃綁定', '#暱稱', '＃暱稱'])
    
    is_reserved = (
        text in reserved_commands or 
        text.startswith(('/', '／', '查 ', '搜尋 ')) or
        is_hash_cmd
    )
    
    if is_reserved:
        if user_state:
            state_record.state = ""
            state_record.data = {}
            state_record.save()
            user_state = ""
            
        if text == '取消':
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="✅ 已為您取消目前的動作。"))
            return
            
    if text in ['查', '快速查詢']:
        state_record.state = "WAITING_FOR_SEARCH_QUERY"
        state_record.save()
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="🔍 您欲查詢哪部電影呢？\n請直接輸入電影名稱："))
        return
        
    if user_state == "WAITING_FOR_SEARCH_QUERY":
        state_record.state = ""
        state_record.save()
        try:
            # 把輸入的文字當作 keyword 進行查詢
            keyword = text.strip()
            reviews = Review.objects.filter(movie__title__icontains=keyword, is_deleted=False).order_by('-created_at')[:5]
            
            if not reviews:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"找不到關於「{keyword}」的心得。"))
                return
                
            frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
            flex_carousel = get_review_carousel_flex(reviews, frontend_url)
            
            messages = [FlexSendMessage(alt_text=f"🔍 「{keyword}」的搜尋結果", contents=flex_carousel)]
            
            if user:
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}&token={access_token}&refresh={refresh_token}"
                messages.append(FlexSendMessage(alt_text="🔗 前往網頁版自動登入", contents=get_auto_login_flex(search_link)))
                
            line_bot_api.reply_message(event.reply_token, messages)
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"系統查詢時發生錯誤：{str(e)}"))
            except:
                pass
        return
        
    if text.startswith('查 ') or text.startswith('搜尋 '):
        try:
            keyword = text.split(' ', 1)[1].strip()
            reviews = Review.objects.filter(movie__title__icontains=keyword, is_deleted=False).order_by('-created_at')[:5]
            
            if not reviews:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"找不到關於「{keyword}」的心得。"))
                return
                
            frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
            flex_carousel = get_review_carousel_flex(reviews, frontend_url)
            
            messages = [FlexSendMessage(alt_text=f"🔍 「{keyword}」的搜尋結果", contents=flex_carousel)]
            
            if user:
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}&token={access_token}&refresh={refresh_token}"
                messages.append(FlexSendMessage(alt_text="🔗 前往網頁版自動登入", contents=get_auto_login_flex(search_link)))
                
            line_bot_api.reply_message(event.reply_token, messages)
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"系統查詢時發生錯誤：{str(e)}"))
            except:
                pass
        return
        
    if user_state == "WAITING_FOR_SPEED_RATING":
        rating_text = text.strip()
        if not rating_text.isdigit() or not (1 <= int(rating_text) <= 5):
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 評分格式錯誤！請輸入 1 到 5 之間的數字 (或點擊上方的按鈕)：\n\n(隨時可以回覆「取消」取消進度喔～)"))
            return
            
        rating = int(rating_text)
        raw_movie_title = state_record.data.get('review_title')
        movie_title = normalize_movie_title(raw_movie_title)
        
        # Clear state
        state_record.state = ""
        state_record.data = {}
        state_record.save()
        
        # Create review with empty content
        movie, _ = Movie.objects.get_or_create(title=movie_title, defaults={'release_year': timezone.now().year, 'director': 'Unknown'})
        
        review = Review.objects.create(
            user=user,
            movie=movie,
            rating=rating,
            content="", 
            source='line'
        )
        
        # Add TMDB genres automatically
        from api.utils.tmdb import fetch_movie_genres
        from api.models import Tag
        
        movie_tag, _ = Tag.objects.get_or_create(name=movie_title)
        review.tags.add(movie_tag)
        
        tmdb_genres = fetch_movie_genres(movie_title)
        for genre in tmdb_genres:
            if genre != movie_title:
                tag_obj, _ = Tag.objects.get_or_create(name=genre)
                review.tags.add(tag_obj)
                
        user_exp = add_user_experience(user, 10)
        
        frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
        movie_url = f"{frontend_url}/movies/{movie.id}"
        
        flex_bubble = get_exp_feedback_flex(user, 10, user_exp.level, user_exp.exp, movie_url=movie_url)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="評分成功！經驗值增加", contents=flex_bubble))
        return

    # --- Stateful Review Creation ---
    if text in ['寫心得', '發布感想']:
        state_record.state = "WAITING_FOR_REVIEW_TITLE"
        state_record.save()
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="📝 準備發布心得！\n\n請輸入您要分享的【電影名稱】：\n\n(隨時可以回覆「取消」取消進度喔～)"))
        return
        
    if user_state == "WAITING_FOR_REVIEW_TITLE":
        movie_title = normalize_movie_title(text.strip())
        state_record.data['review_title'] = movie_title
        state_record.state = "WAITING_FOR_REVIEW_RATING"
        state_record.save()
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"「{movie_title}」\n\n請輸入您對這部電影的【評分】(請輸入 1 到 5 之間的數字)：\n\n(隨時可以回覆「取消」取消進度喔～)"))
        return
        
    if user_state == "WAITING_FOR_REVIEW_RATING":
        rating_text = text.strip()
        if not rating_text.isdigit() or not (1 <= int(rating_text) <= 5):
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 評分格式錯誤！請輸入 1 到 5 之間的數字：\n\n(隨時可以回覆「取消」取消進度喔～)"))
            return
            
        rating = int(rating_text)
        state_record.data['review_rating'] = rating
        state_record.state = "WAITING_FOR_REVIEW_CONTENT"
        state_record.save()
        
        movie_title = state_record.data.get('review_title')
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"您給了 {rating} 顆星！🌟\n\n最後一步，請輸入您的【心得內容】：\n\n(隨時可以回覆「取消」取消進度喔～)"))
        return
        
    if user_state == "WAITING_FOR_REVIEW_CONTENT":
        content = text.strip()
        state_record.data['review_content'] = content
        state_record.state = "WAITING_FOR_REVIEW_TAGS"
        state_record.save()
        
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="太棒了！📝\n\n最後，請為這篇心得加上【Hashtag】 (請用 # 開頭，例如：#動作片 #好雷)。\n若不需要標籤，請直接輸入「無」或「略過」：\n\n(隨時可以回覆「取消」取消進度喔～)"))
        return

    if user_state == "WAITING_FOR_REVIEW_TAGS":
        tag_text = text.strip()
        
        movie_title = state_record.data.get('review_title')
        rating = state_record.data.get('review_rating')
        content = state_record.data.get('review_content')
        
        # Clear state
        state_record.state = ""
        state_record.data = {}
        state_record.save()
        
        # Create review
        movie, _ = Movie.objects.get_or_create(title=movie_title, defaults={'release_year': timezone.now().year, 'director': 'Unknown'})
        
        review = Review.objects.create(
            user=user,
            movie=movie,
            rating=rating,
            content=content,
            source='line'
        )

        # Process tags
        from api.models import Tag
        
        # 預設自動加上電影名稱的 tag
        movie_tag, _ = Tag.objects.get_or_create(name=movie_title)
        review.tags.add(movie_tag)
        
        if tag_text not in ['無', '略過', '沒有']:
            # 用 # 分割，並移除每個標籤中包含的空白和分號
            raw_tags = tag_text.split('#')
            tags = []
            for t in raw_tags:
                import re
                cleaned = re.sub(r'[\s;]', '', t)
                if cleaned:
                    tags.append(cleaned)
                    
            has_spoiler = False
            for tag_name in tags:
                if tag_name in ['爆雷', '有雷', '劇透', '雷']:
                    has_spoiler = True
                if tag_name != movie_title:
                    tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                    review.tags.add(tag_obj)
            if has_spoiler:
                review.is_spoiler = True
                review.save()
        
        user_exp = add_user_experience(user, 25)
        
        frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
        movie_url = f"{frontend_url}/movies/{movie.id}"
        
        flex_bubble = get_exp_feedback_flex(user, 25, user_exp.level, user_exp.exp, movie_url=movie_url)
        
        line_bot_api.reply_message(
            event.reply_token, 
            FlexSendMessage(alt_text="發布成功！經驗值增加", contents=flex_bubble)
        )
        return

    if text == '急速評星':
        from api.utils.tmdb import GENRE_MAP
        import random
        all_genres = list(GENRE_MAP.items())
        random.shuffle(all_genres)
        genres_subset = all_genres[:10]
        
        flex_carousel = get_speed_rate_genres_flex(genres_subset)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="選擇你想評分的電影類型", contents=flex_carousel))
        return
        
    if text == '影迷名片':
        from api.models import UserExperience, Vote
        # 取得公開暱稱
        try:
            nickname = user.profile.nickname
        except:
            nickname = user.line_display_name or user.username
            
        # 取得等級與經驗值
        user_exp, _ = UserExperience.objects.get_or_create(user=user)
        level = user_exp.level
        if level < 1:
            level = 1
        current_exp = user_exp.exp
        exp_needed = level * 100
        
        # 身分標章
        if level >= 5:
            badge_title = "🥉 青銅冒險家"
            badge_color = "#CD7F32"
        elif level >= 2:
            badge_title = "✨ 唉呦不錯呦"
            badge_color = "#FFD700"
        elif level >= 1:
            badge_title = "🌱 初出茅廬"
            badge_color = "#6BCB77"
        else:
            badge_title = "🎬 新手影迷"
            badge_color = "#888888"
        
        # 已發布心得
        review_count = Review.objects.filter(user=user, is_deleted=False).count()
        
        # 獲得推薦數 (按讚數)
        likes_received = Vote.objects.filter(review__user=user, vote_type=1).count()
        
        # 常用標籤
        from django.db.models import Count
        from api.models import Tag
        top_tags = Tag.objects.filter(
            reviews__user=user, 
            reviews__is_deleted=False
        ).annotate(
            use_count=Count('reviews')
        ).order_by('-use_count')[:3]
        
        tag_str = " ".join([f"#{t.name.replace('#', '')}" for t in top_tags]) if top_tags else "尚無"
        
        # 經驗值進度條（用方塊視覺化）
        progress_blocks = int((current_exp / exp_needed) * 10) if exp_needed > 0 else 0
        progress_bar = "▓" * progress_blocks + "░" * (10 - progress_blocks)
        
        flex_card = {
            "type": "bubble",
            "size": "mega",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "🎬 專屬影迷名片",
                        "weight": "bold",
                        "color": "#FFFFFF",
                        "size": "xl"
                    },
                    {
                        "type": "text",
                        "text": badge_title,
                        "size": "md",
                        "color": badge_color,
                        "weight": "bold",
                        "margin": "sm"
                    }
                ],
                "backgroundColor": "#2D1B69",
                "paddingAll": "20px"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    # 暱稱區塊
                    {
                        "type": "text",
                        "text": nickname,
                        "weight": "bold",
                        "size": "xxl",
                        "color": "#111111"
                    },
                    {"type": "separator", "margin": "lg"},
                    # 等級與經驗值
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {"type": "text", "text": f"⭐ Lv. {level}", "size": "md", "color": "#8B5CF6", "weight": "bold", "flex": 3},
                                    {"type": "text", "text": f"EXP {current_exp}/{exp_needed}", "size": "sm", "color": "#888888", "align": "end", "flex": 5}
                                ]
                            },
                            {
                                "type": "text",
                                "text": progress_bar,
                                "size": "sm",
                                "color": "#8B5CF6",
                                "margin": "sm"
                            }
                        ],
                        "margin": "lg"
                    },
                    {"type": "separator", "margin": "lg"},
                    # 數據統計
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {"type": "text", "text": str(review_count), "size": "xl", "weight": "bold", "color": "#111111", "align": "center"},
                                    {"type": "text", "text": "📝 發布心得", "size": "xs", "color": "#888888", "align": "center", "margin": "sm"}
                                ],
                                "flex": 1
                            },
                            {"type": "separator"},
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {"type": "text", "text": str(likes_received), "size": "xl", "weight": "bold", "color": "#111111", "align": "center"},
                                    {"type": "text", "text": "👍 獲得推薦", "size": "xs", "color": "#888888", "align": "center", "margin": "sm"}
                                ],
                                "flex": 1
                            }
                        ],
                        "margin": "lg",
                        "paddingAll": "sm"
                    },
                    {"type": "separator", "margin": "lg"},
                    # 常用標籤
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {"type": "text", "text": "🏷️ 常用標籤", "size": "sm", "color": "#888888"},
                            {"type": "text", "text": tag_str, "size": "sm", "color": "#8B5CF6", "weight": "bold", "wrap": True, "margin": "sm"}
                        ],
                        "margin": "lg"
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "💡 發布心得 +25 EXP｜留言 +10 EXP｜被按讚 +1 EXP",
                        "size": "xxs",
                        "color": "#aaaaaa",
                        "wrap": True,
                        "align": "center"
                    }
                ]
            }
        }
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="專屬影迷名片", contents=flex_card))
        return

    if text == '近期活動':
        events = Event.objects.filter(event_time__gte=timezone.now()).order_by('event_time')[:5]
        if not events:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="近期沒有活動喔！趕快來發起一個吧！"))
            return
            
        flex_carousel = get_events_list_flex(events)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="📅 近期電影揪團", contents=flex_carousel))
        return

    if text == '影評推薦':
        try:
            from django.db.models import Count, Q
            # 取前 3 名熱門
            trending_reviews = list(Review.objects.filter(is_deleted=False).annotate(
                upvotes=Count('votes', filter=Q(votes__vote_type=1))
            ).order_by('-upvotes', '-created_at')[:3])
            
            # 取 2 名冷門 (隨機挑選除了前三名以外的心得)
            exclude_ids = [r.id for r in trending_reviews]
            cold_reviews = list(Review.objects.filter(is_deleted=False).exclude(id__in=exclude_ids).order_by('?')[:2])
            
            # 合併
            trending_reviews.extend(cold_reviews)
            
            if not trending_reviews:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="目前還沒有影評喔！趕快來發布第一篇吧！"))
                return
                
            frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
            flex_carousel = get_review_carousel_flex(trending_reviews, frontend_url)
            
            line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="✨ 影評推薦", contents=flex_carousel))
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"載入熱門影評時發生錯誤：{str(e)}"))
            except:
                pass
        return

    if text.startswith('#揪團') or text.startswith('＃揪團'):
        title_match = re.search(r'活動[：:]\s*([^\n]+)', text)
        time_match = re.search(r'時間[：:]\s*([^\n]+)', text)
        location_match = re.search(r'地點[：:]\s*([^\n]+)', text)
        description_match = re.search(r'描述[：:]\s*(.+)', text, re.DOTALL)
        
        if title_match and time_match and location_match:
            title = title_match.group(1).strip().strip('【】[]')
            time_str = time_match.group(1).strip().strip('【】[]')
            location = location_match.group(1).strip().strip('【】[]')
            description = description_match.group(1).strip().strip('【】[]') if description_match else ""
            
            try:
                time_str_clean = time_str.replace('/', '-')
                event_time = datetime.strptime(time_str_clean, '%Y-%m-%d %H:%M')
                event_time = make_aware(event_time)
            except ValueError:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="時間格式錯誤，請使用 YYYY-MM-DD HH:MM 格式，例如：2024-12-31 19:00"))
                return
            
            try:
                organizer_nickname = user.profile.nickname
            except:
                organizer_nickname = user.line_display_name or user.username
                
            new_event = Event.objects.create(
                user=user,
                title=title,
                location=location,
                event_time=event_time,
                organizer_nickname=organizer_nickname,
                description=description
            )
            # 自動加入主辦人
            if user:
                new_event.attendees.add(user)
            
            flex_card = get_event_success_flex(new_event)
            line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="✅ 揪團建立成功", contents=flex_card))
            return
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="揪團格式錯誤，請參考範例：\n#揪團\n活動：看電影\n時間：2024-12-31 19:00\n地點：信義威秀\n描述：大家一起來"))
            return

    if text.startswith('加入揪團'):
        try:
            parts = text.split()
            if len(parts) < 2:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="指令錯誤！請輸入「加入揪團 [代碼]」"))
                return
                
            join_code = parts[1].strip().upper()
            event_obj = Event.objects.filter(join_code=join_code).first()
            
            if not event_obj:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"找不到代碼為「{join_code}」的活動。請確認代碼是否正確！"))
                return
                
            if not user:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="請先設定暱稱或綁定帳號後才能參加揪團喔！"))
                return
                
            if event_obj.attendees.filter(campus_id=user.campus_id).exists():
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"您已經加入過「{event_obj.title}」囉！"))
                return
                
            event_obj.attendees.add(user)
            current_count = event_obj.attendees.count()
            
            reply_text = f"✅ 成功加入【{event_obj.title}】！\n目前共有 {current_count} 人參加。"
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply_text))
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"加入時發生錯誤：{str(e)}"))
            except:
                pass
        return

    try:
        line_bot_api.reply_message(
            event.reply_token, 
            TextSendMessage(text="無法辨識指令，可試試：「#心得」、「查 奧德賽」、「近期活動」、「急速評星」。\n\n💡 忘記指令？輸入「/規則」即可查看規則喔！")
        )
    except LineBotApiError:
        pass

@handler.add(PostbackEvent)
def handle_postback(event):
    line_user_id = event.source.user_id
    data = event.postback.data
    import urllib.parse
    parsed_data = dict(urllib.parse.parse_qsl(data))
    action = parsed_data.get('action')
    
    if action in ['speed_rate_genre', 'speed_rate_no']:
        genre_id = parsed_data.get('genre_id')
        from api.utils.tmdb import fetch_random_movies_by_genre
        from django.conf import settings as django_settings
        
        # 診斷：檢查 TMDB_API_KEY 是否存在
        tmdb_key = getattr(django_settings, 'TMDB_API_KEY', '')
        if not tmdb_key:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="⚠️ 系統設定異常：TMDB API Key 尚未設定，請聯繫管理員在 Render 環境變數中加入 TMDB_API_KEY。"))
            return
        
        movies_data = fetch_random_movies_by_genre(genre_id, count=3)
        
        if not movies_data:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="抱歉，目前抓取電影發生異常，請稍後再試！"))
            return
            
        flex_card = get_speed_rate_movies_carousel_flex(movies_data, genre_id)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="請挑選您看過的電影", contents=flex_card))
        return
        
    if action == 'speed_rate_yes':
        movie_title = parsed_data.get('movie_title')
        genre_id = parsed_data.get('genre_id', 'popular')
        
        # 防止重複評價
        movie = Movie.objects.filter(title=movie_title).first()
        user = User.objects.filter(line_user_id=line_user_id).first()
        if movie and user and Review.objects.filter(user=user, movie=movie).exists():
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"⚠️ 您已經評價過《{movie_title}》囉！"))
            return
        
        # 顯示評分卡片 (不再使用 Quick Reply)
        flex_card = get_speed_rate_score_flex(movie_title, genre_id)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text=f"請為《{movie_title}》打分數", contents=flex_card))
        return

    if action == 'speed_rate_score':
        rating = int(parsed_data.get('score'))
        raw_movie_title = parsed_data.get('title')
        movie_title = normalize_movie_title(raw_movie_title)
        genre_id = parsed_data.get('genre_id', 'popular')
        
        user = User.objects.filter(line_user_id=line_user_id).first()
        if not user:
            return
            
        movie, _ = Movie.objects.get_or_create(title=movie_title, defaults={'release_year': timezone.now().year, 'director': 'Unknown'})
        
        # Check if already exists to prevent spam
        existing_review = Review.objects.filter(user=user, movie=movie).first()
        if existing_review:
            if existing_review.rating == rating and existing_review.content == "":
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"⚠️ 您已經為《{movie_title}》打過 {rating} 星囉！"))
            else:
                existing_review.rating = rating
                existing_review.save()
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"✅ 已為您將《{movie_title}》的評分更新為 {rating} 星！\n(註：重複評分不會再次獲得經驗值喔)"))
            return
            
        # Create review with empty content
        review = Review.objects.create(
            user=user,
            movie=movie,
            rating=rating,
            content="", 
            source='line'
        )
        
        # Add TMDB genres automatically
        from api.utils.tmdb import fetch_movie_genres
        from api.models import Tag
        
        movie_tag, _ = Tag.objects.get_or_create(name=movie_title)
        review.tags.add(movie_tag)
        
        tmdb_genres = fetch_movie_genres(movie_title)
        for genre in tmdb_genres:
            if genre != movie_title:
                tag_obj, _ = Tag.objects.get_or_create(name=genre)
                review.tags.add(tag_obj)
                
        user_exp = add_user_experience(user, 10)
        
        frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
        movie_url = f"{frontend_url}/movies/{movie.id}"
        
        flex_bubble = get_exp_feedback_flex(user, 10, user_exp.level, user_exp.exp, movie_url=movie_url)
        
        # 評分完畢後自動推送下三部電影
        from api.utils.tmdb import fetch_random_movies_by_genre
        next_movies_data = fetch_random_movies_by_genre(genre_id, count=3)
        messages_to_send = [FlexSendMessage(alt_text="評分成功！經驗值增加", contents=flex_bubble)]
        
        if next_movies_data:
            next_movies_flex = get_speed_rate_movies_carousel_flex(next_movies_data, genre_id)
            messages_to_send.append(FlexSendMessage(alt_text="為您推薦更多電影", contents=next_movies_flex))
            
        line_bot_api.reply_message(event.reply_token, messages_to_send)
        return
