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
from linebot.models import MessageEvent, TextMessage, TextSendMessage, FlexSendMessage
from linebot.exceptions import InvalidSignatureError, LineBotApiError
from rest_framework_simplejwt.tokens import RefreshToken

from dotenv import load_dotenv

from api.models import User, Review, Movie, Event, UserProfile, OutsiderIdentity, LineBotState
from api.domains.gamification.services import add_user_experience
from .flex_templates import get_exp_feedback_flex

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
        rules_text = (
            "🎬 【影像製作所 Bot 指令規則】\n\n"
            "如果想直接發布，也可以使用快速格式：\n"
            "📝 發布心得格式：\n"
            "#心得\n"
            "電影：奧德賽\n"
            "評分：5\n"
            "標籤：#動作片 (選填)\n"
            "心得：這部電影太好看了！\n\n"
            "✏️ 設定專屬暱稱 (限一次)：\n"
            "#暱稱 你的暱稱\n"
            "※ 範例：#暱稱 影迷小明\n\n"
            "🔗 綁定網頁帳號：\n"
            "#綁定 帳號 密碼\n\n"
            "🔍 搜尋電影評價：\n"
            "查 奧德賽\n\n"
            "📅 尋找近期活動：\n"
            "近期活動\n\n"
            "🤝 發起揪團活動：\n"
            "#揪團\n"
            "活動：看電影\n"
            "時間：2024-12-31 19:00\n"
            "地點：信義威秀\n"
            "描述：大家一起來看死侍\n\n"
            "🔗 舊用戶綁定：\n"
            "#綁定 123456789/myemail@gmail.com mypassword"
        )
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=rules_text))
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
        content_match = re.search(r'心得：(.+)', text, re.DOTALL)
        
        if movie_match and rating_match and content_match:
            movie_title = movie_match.group(1).strip()
            rating = min(max(int(rating_match.group(1).strip()), 1), 5)
            content = content_match.group(1).strip()
            
            movie, _ = Movie.objects.get_or_create(title=movie_title, defaults={'release_year': timezone.now().year, 'director': 'Unknown'})
            
            review = Review.objects.create(
                user=user,
                movie=movie,
                rating=rating,
                content=content,
                source='line'
            )
            
            from api.models import Tag
            movie_tag, _ = Tag.objects.get_or_create(name=movie_title)
            review.tags.add(movie_tag)
            
            if tag_match:
                tag_text = tag_match.group(1).strip()
                tag_text = tag_text.replace('(選填)', '').replace('（選填）', '')
                if tag_text and tag_text not in ['無', '略過', '沒有']:
                    tags = [t.strip() for t in tag_text.split('#') if t.strip()]
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
    reserved_commands = ['寫心得', '影迷名片', '我要揪團', '近期活動', '查', '熱門影評', '取消']
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
            
    if text == '查':
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
                
            reply_lines = [f"🔍 「{keyword}」的心得搜尋結果："]
            for r in reviews:
                content_str = str(r.content)[:20] if r.content else ""
                reply_lines.append(f"- {r.movie.title} ({r.rating}星): {content_str}...")
                
            if user:
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}&token={access_token}&refresh={refresh_token}"
                reply_lines.append(f"\n🔗 點此前往網頁查看並自動登入：\n{search_link}")
                
            reply_lines.append("\n💡 忘記指令？輸入「/規則」即可查看規則喔！")
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
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
                
            reply_lines = [f"🔍 「{keyword}」的心得搜尋結果："]
            for r in reviews:
                content_str = str(r.content)[:20] if r.content else ""
                reply_lines.append(f"- {r.movie.title} ({r.rating}星): {content_str}...")
                
            if user:
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}&token={access_token}&refresh={refresh_token}"
                reply_lines.append(f"\n🔗 點此前往網頁查看並自動登入：\n{search_link}")
                
            reply_lines.append("\n💡 忘記指令？輸入「/規則」即可查看規則喔！")
            
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"系統查詢時發生錯誤：{str(e)}"))
            except:
                pass
        return

    # --- Stateful Review Creation ---
    if text == '寫心得':
        state_record.state = "WAITING_FOR_REVIEW_TITLE"
        state_record.save()
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="📝 準備發布心得！\n\n請輸入您要分享的【電影名稱】："))
        return
        
    if user_state == "WAITING_FOR_REVIEW_TITLE":
        movie_title = text.strip()
        state_record.data['review_title'] = movie_title
        state_record.state = "WAITING_FOR_REVIEW_RATING"
        state_record.save()
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"「{movie_title}」\n\n請輸入您對這部電影的【評分】(請輸入 1 到 5 之間的數字)："))
        return
        
    if user_state == "WAITING_FOR_REVIEW_RATING":
        rating_text = text.strip()
        if not rating_text.isdigit() or not (1 <= int(rating_text) <= 5):
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 評分格式錯誤！請輸入 1 到 5 之間的數字："))
            return
            
        rating = int(rating_text)
        state_record.data['review_rating'] = rating
        state_record.state = "WAITING_FOR_REVIEW_CONTENT"
        state_record.save()
        
        movie_title = state_record.data.get('review_title')
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"您給了 {rating} 顆星！🌟\n\n最後一步，請輸入您的【心得內容】："))
        return
        
    if user_state == "WAITING_FOR_REVIEW_CONTENT":
        content = text.strip()
        state_record.data['review_content'] = content
        state_record.state = "WAITING_FOR_REVIEW_TAGS"
        state_record.save()
        
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="太棒了！📝\n\n最後，請為這篇心得加上【Hashtag】 (請用 # 開頭，例如：#動作片 #好雷)。\n若不需要標籤，請直接輸入「無」或「略過」："))
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
            tags = [t.strip() for t in tag_text.split('#') if t.strip()]
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

    if text == '我要揪團':
        reply_text = (
            "🤝 想要發起電影揪團嗎？請複製以下格式並填寫內容後發送給我：\n\n"
            "#揪團\n"
            "活動：【請填寫活動名稱】\n"
            "時間：【YYYY-MM-DD HH:MM】\n"
            "地點：【請填寫地點】\n"
            "描述：【請填寫想說的話】\n\n"
            "💡 範例：\n"
            "#揪團\n"
            "活動：一起看死侍與金鋼狼\n"
            "時間：2024-12-31 19:00\n"
            "地點：信義威秀\n"
            "描述：目前缺2人，看完一起吃晚餐！"
        )
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply_text))
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
        
        tag_str = " ".join([f"#{t.name.replace('#', '')}" for t in top_tags]) if top_tags else "無"
        
        reply_text = (
            "🎬 【您的專屬影迷名片】\n\n"
            f"👤 公開暱稱：{nickname}\n"
            f"⭐ 等級：Lv. {level}\n"
            f"✨ 經驗值：{current_exp} / {exp_needed}\n"
            f"📝 已發布心得：{review_count} 篇\n"
            f"👍 獲得推薦數：{likes_received} 次\n"
            f"🏷️ 常用標籤：{tag_str}\n\n"
            "💡 小提示：發布心得 +25 EXP，留言 +10 EXP，獲得按讚 +1 EXP！"
        )
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply_text))
        return

    if text == '近期活動':
        events = Event.objects.filter(event_time__gte=timezone.now()).order_by('event_time')[:5]
        if not events:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="近期沒有活動喔！趕快來發起一個吧！"))
            return
            
        reply_lines = ["📅 近期揪電影活動："]
        for e in events:
            time_str = e.event_time.strftime('%m/%d %H:%M')
            reply_lines.append(f"- [{time_str}] {e.title}\n  地點: {e.location}\n  發起人: {e.organizer_nickname}")
            
        reply_lines.append("\n💡 忘記指令？輸入「/規則」即可查看規則喔！")
            
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
        return

    if text == '熱門影評':
        try:
            from django.db.models import Count, Q
            # 撈取按讚數最高的 5 篇心得
            trending_reviews = Review.objects.filter(is_deleted=False).annotate(
                upvotes=Count('votes', filter=Q(votes__vote_type=1))
            ).order_by('-upvotes', '-created_at')[:5]
            
            if not trending_reviews:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="目前還沒有熱門影評喔！趕快來發布第一篇吧！"))
                return
                
            reply_lines = ["🔥 全站最熱門影評："]
            for r in trending_reviews:
                content_str = str(r.content)[:20] if r.content else ""
                reply_lines.append(f"⭐ {r.movie.title} ({r.upvotes} 個推)\n   「{content_str}...」")
                
            frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
            reply_lines.append(f"\n👉 點此前往網站看完整熱門影評：\n{frontend_url}")
            
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"載入熱門影評時發生錯誤：{str(e)}"))
            except:
                pass
        return

    if text.startswith('#揪團') or text.startswith('＃揪團'):
        title_match = re.search(r'活動：([^\n]+)', text)
        time_match = re.search(r'時間：([^\n]+)', text)
        location_match = re.search(r'地點：([^\n]+)', text)
        description_match = re.search(r'描述：(.+)', text, re.DOTALL)
        
        if title_match and time_match and location_match:
            title = title_match.group(1).strip()
            time_str = time_match.group(1).strip()
            location = location_match.group(1).strip()
            description = description_match.group(1).strip() if description_match else ""
            
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
            
            reply_text = f"✅ 發起活動成功！\n\n活動名稱：{title}\n時間：{time_str}\n地點：{location}\n\n大家可以使用「近期活動」來查看你的揪團喔！"
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply_text))
            return
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="揪團格式錯誤，請參考範例：\n#揪團\n活動：看電影\n時間：2024-12-31 19:00\n地點：信義威秀\n描述：大家一起來"))
            return

    try:
        line_bot_api.reply_message(
            event.reply_token, 
            TextSendMessage(text="無法辨識指令，可試試：「#心得」、「查 奧德賽」、「近期活動」、「#揪團」。\n\n💡 忘記指令？輸入「/規則」即可查看規則喔！")
        )
    except LineBotApiError:
        pass
