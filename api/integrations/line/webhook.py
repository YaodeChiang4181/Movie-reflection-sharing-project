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

from api.models import User, Review, Movie, Event, UserProfile, OutsiderIdentity, LineBotState, DriftBottle
from api.domains.gamification.services import add_user_experience
from api.utils.text_utils import normalize_movie_title
from .flex_templates import (
    get_exp_feedback_flex, get_review_carousel_flex, get_events_list_flex, 
    get_event_success_flex, get_auto_login_flex, get_speed_rate_genres_flex, 
    get_speed_rate_movies_carousel_flex, get_rules_flex, get_speed_rate_score_flex,
    get_drift_bottle_menu_flex, get_drift_bottle_recommend_flex, get_website_button_flex
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
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        flex_card = get_rules_flex(frontend_url)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="映後時光 Bot 指令規則", contents=flex_card))
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
                    line_bot_api.reply_message(event.reply_token, TextSendMessage(text="此帳號已綁定其他 LINE 帳號。"))
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
                
                frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
                btn_flex = get_website_button_flex(frontend_url)
                line_bot_api.reply_message(event.reply_token, [
                    TextSendMessage(text=f"帳號綁定完成。歡迎回來，{target_user.username or target_user.campus_id}。"),
                    FlexSendMessage(alt_text="前往映後時光", contents=btn_flex)
                ])
            else:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="帳號或密碼錯誤，請重新確認。"))
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
            
            if len(new_nickname) > 50:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="暱稱長度請限制在 50 個字元以內。"))
                return
                
            if UserProfile.objects.filter(nickname=new_nickname).exclude(user=user).exists():
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"暱稱「{new_nickname}」已被使用，請嘗試其他名稱。"))
                return
                
            if user.profile.nickname_updated_at:
                from django.utils import timezone
                time_diff = timezone.now() - user.profile.nickname_updated_at
                if time_diff.total_seconds() < 300: # 5 minutes
                    remaining = int(300 - time_diff.total_seconds())
                    minutes = remaining // 60
                    seconds = remaining % 60
                    line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"更改過於頻繁，請於 {minutes} 分 {seconds} 秒後再試。"))
                    return
                    
            from django.utils import timezone
            user.profile.nickname = new_nickname
            user.profile.nickname_updated_at = timezone.now()
            user.profile.save()
            
            frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
            btn_flex = get_website_button_flex(frontend_url)
            line_bot_api.reply_message(event.reply_token, [
                TextSendMessage(text=f"暱稱設定完成，已更新為「{new_nickname}」。"),
                FlexSendMessage(alt_text="前往映後時光", contents=btn_flex)
            ])
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="暱稱設定格式錯誤，請參考範例 (中間要有空格，不需括號)：\n#暱稱 影迷小明"))
        return

    # --- 兩階段心得狀態機與自然評分管線 ---
    from .review_pipeline import (
        extract_quick_rating_intent,
        handle_stage_one_rating,
        handle_stage_two_content
    )

    state_record, _ = LineBotState.objects.get_or_create(line_user_id=line_user_id)
    user_state = state_record.state

    # 處於階段二：等待心得內文追加
    if user_state == "WAITING_FOR_REVIEW_CONTENT":
        exit_commands = ['取消', '完成', '結束', '保留', '不用了', '略過']
        reserved_nav = ['寫心得', '發布感想', '影迷名片', '急速評星', '近期活動', '查', '快速查詢', '影評推薦', '片單漂流瓶', '推薦電影', '來部推薦']
        if text in exit_commands:
            state_record.state = ""
            state_record.data = {}
            state_record.save()
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="已保留評分紀錄。"))
            return
        elif text in reserved_nav or text.startswith(('/', '／', '查 ', '搜尋 ', '#綁定', '＃綁定', '#暱稱', '＃暱稱')):
            state_record.state = ""
            state_record.data = {}
            state_record.save()
            user_state = ""
        else:
            response_msg = handle_stage_two_content(user, state_record, text)
            line_bot_api.reply_message(event.reply_token, response_msg)
            return

    # 自然意圖解析：階段一評星 (支援「沙丘 5」、「奧本海默 4星」及相容傳統 #心得)
    movie_title, score, extra_data = extract_quick_rating_intent(text)
    if movie_title and score:
        response_msg = handle_stage_one_rating(user, line_user_id, movie_title, score, extra_data=extra_data)
        line_bot_api.reply_message(event.reply_token, response_msg)
        return

    # --- Stateful Search Logic ---
    # 攔截關鍵指令，強制退出目前的狀態 (避免在輸入電影名稱時，按到選單按鈕變成輸入電影名稱)
    reserved_commands = ['寫心得', '發布感想', '影迷名片', '急速評星', '近期活動', '查', '快速查詢', '影評推薦', '取消', '片單漂流瓶', '推薦電影', '來部推薦']
    is_hash_cmd = any(text.startswith(c) for c in ['#揪團', '＃揪團', '#綁定', '＃綁定', '#暱稱', '＃暱稱'])
    
    is_reserved = (
        text in reserved_commands or 
        text.startswith(('/', '／', '查 ', '搜尋 ', '回覆漂流瓶 #')) or
        is_hash_cmd
    )
    
    if is_reserved:
        if user_state:
            state_record.state = ""
            state_record.data = {}
            state_record.save()
            user_state = ""
            
        if text == '取消':
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="已取消目前的動作。"))
            return
            
    if text in ['查', '快速查詢']:
        state_record.state = "WAITING_FOR_SEARCH_QUERY"
        state_record.save()
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        btn_flex = get_website_button_flex(frontend_url)
        line_bot_api.reply_message(event.reply_token, [
            TextSendMessage(text="請輸入您欲查詢的電影名稱："),
            FlexSendMessage(alt_text="前往映後時光", contents=btn_flex)
        ])
        return
        
    if user_state == "WAITING_FOR_SEARCH_QUERY":
        state_record.state = ""
        state_record.save()
        try:
            # 把輸入的文字當作 keyword 進行查詢
            keyword = text.strip()
            from django.db.models import Q
            reviews = Review.objects.filter(
                Q(movie__title__icontains=keyword) | Q(movie__original_title__icontains=keyword), 
                is_deleted=False
            ).order_by('-created_at')[:5]
            
            if not reviews:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"找不到關於「{keyword}」的心得。"))
                return
                
            frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
            
            # 根據是否有登入產生專屬的 frontend_url
            if user:
                from api.models import AuthCode
                import secrets
                
                code = secrets.token_urlsafe(32)
                AuthCode.objects.create(code=code, user=user)
                
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}&auth_code={code}"
            else:
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}"

            flex_carousel = get_review_carousel_flex(reviews, search_link)
            
            line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text=f"「{keyword}」的搜尋結果", contents=flex_carousel))
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"系統查詢時發生錯誤：{str(e)}"))
            except:
                pass
        return
        
    if text.startswith('查 ') or text.startswith('搜尋 '):
        try:
            keyword = text.split(' ', 1)[1].strip()
            from django.db.models import Q
            reviews = Review.objects.filter(
                Q(movie__title__icontains=keyword) | Q(movie__original_title__icontains=keyword), 
                is_deleted=False
            ).order_by('-created_at')[:5]
            
            if not reviews:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"找不到關於「{keyword}」的心得。"))
                return
                
            frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
            
            # 根據是否有登入產生專屬的 frontend_url
            if user:
                from api.models import AuthCode
                import secrets
                
                code = secrets.token_urlsafe(32)
                AuthCode.objects.create(code=code, user=user)
                
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}&auth_code={code}"
            else:
                encoded_keyword = urllib.parse.quote(keyword)
                search_link = f"{frontend_url}/search?q={encoded_keyword}"

            flex_carousel = get_review_carousel_flex(reviews, search_link)
            
            line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text=f"「{keyword}」的搜尋結果", contents=flex_carousel))
        except Exception as e:
            try:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"系統查詢時發生錯誤：{str(e)}"))
            except:
                pass
        return
        
    if user_state == "WAITING_FOR_SPEED_RATING":
        rating_text = text.strip()
        if not rating_text.isdigit() or not (1 <= int(rating_text) <= 5):
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="評分格式有誤，請輸入 1 至 5 的數字。\n(輸入「取消」可中斷操作)"))
            return
            
        rating = int(rating_text)
        raw_movie_title = state_record.data.get('review_title')
        movie_title = normalize_movie_title(raw_movie_title)
        
        # Clear state
        state_record.state = ""
        state_record.data = {}
        state_record.save()
        
        # Create review with empty content
        from api.utils.tmdb import get_or_create_movie
        movie, _, tmdb_genres = get_or_create_movie(movie_title)
        
        review = Review.objects.create(
            user=user,
            movie=movie,
            rating=rating,
            content="", 
            source='line'
        )
        
        # Add TMDB genres automatically
        from api.models import Tag
        
        movie_tag, _ = Tag.objects.get_or_create(name=movie_title)
        review.tags.add(movie_tag)
        
        for genre in tmdb_genres:
            if genre != movie_title:
                tag_obj, _ = Tag.objects.get_or_create(name=genre)
                review.tags.add(tag_obj)
                
        user_exp = add_user_experience(user, 10)
        
        frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
        movie_url = f"{frontend_url}/movies/{movie.id}"
        
        flex_bubble = get_exp_feedback_flex(user, 10, user_exp.level, user_exp.exp, movie_url=movie_url)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="評分已記錄", contents=flex_bubble))
        return

    # --- Drift Bottle ---
    if text.startswith('回覆漂流瓶 #'):
        try:
            bottle_id_str = text.replace('回覆漂流瓶 #', '').strip()
            bottle_id = int(bottle_id_str)
            bottle = DriftBottle.objects.get(id=bottle_id)
            
            # 進入等待回覆狀態
            state_record.state = "WAITING_FOR_BOTTLE_REPLY"
            state_record.data['reply_bottle_id'] = bottle_id
            state_record.save()
            
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"請輸入你想對《{bottle.movie_title}》的推薦人說的感謝或留言：\n\n(回覆「取消」可中斷)"))
        except Exception as e:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="查無該漂流瓶。"))
        return

    if user_state == "WAITING_FOR_BOTTLE_REPLY":
        bottle_id = state_record.data.get('reply_bottle_id')
        reply_message = text.strip()
        
        state_record.state = ""
        state_record.data = {}
        state_record.save()
        
        try:
            bottle = DriftBottle.objects.get(id=bottle_id)
            target_line_user_id = bottle.user.line_user_id
            if target_line_user_id:
                try:
                    sender_nickname = user.profile.nickname if hasattr(user, 'profile') else (user.line_display_name or "匿名使用者")
                    from api.integrations.line.flex_templates import get_bottle_reply_flex
                    flex_bubble = get_bottle_reply_flex(bottle, sender_nickname, reply_message)
                    push_msg = FlexSendMessage(alt_text="漂流瓶收到回覆", contents=flex_bubble)
                    line_bot_api.push_message(target_line_user_id, push_msg)
                    line_bot_api.reply_message(event.reply_token, TextSendMessage(text="感謝留言已發送給推薦人。"))
                except Exception as e:
                    line_bot_api.reply_message(event.reply_token, TextSendMessage(text="發送失敗，對方可能暫時無法接收訊息。"))
            else:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="原推薦人尚未綁定 LINE，無法送達留言。"))
        except Exception as e:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="處理感謝訊息時發生錯誤。"))
        return

    if text == '片單漂流瓶':
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        flex = get_drift_bottle_menu_flex(frontend_url)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="片單漂流瓶", contents=flex))
        return

    if text == '推薦電影':
        if not user:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="請先完成帳號綁定（#綁定 帳號 密碼）後再使用漂流瓶功能。"))
            return
        state_record.state = "WAITING_FOR_DRIFT_MOVIE_TITLE"
        state_record.save()
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        btn_flex = get_website_button_flex(frontend_url)
        line_bot_api.reply_message(event.reply_token, [
            TextSendMessage(text="請輸入欲推薦的電影名稱：\n\n(回覆「取消」可中斷)"),
            FlexSendMessage(alt_text="前往映後時光", contents=btn_flex)
        ])
        return

    if user_state == "WAITING_FOR_DRIFT_MOVIE_TITLE":
        movie_title = text.strip()
        state_record.data['drift_movie_title'] = movie_title
        state_record.state = "WAITING_FOR_DRIFT_MOVIE_MESSAGE"
        state_record.save()
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"推薦電影：「{movie_title}」\n\n請輸入你想對收到這個漂流瓶的人說的【一句話或簡短留言】 (若不留言請輸入「略過」)：\n\n(回覆「取消」可中斷)"))
        return

    if user_state == "WAITING_FOR_DRIFT_MOVIE_MESSAGE":
        message = text.strip()
        if message in ['略過', '無', '沒有']:
            message = ""
            
        movie_title = state_record.data.get('drift_movie_title')
        
        state_record.state = ""
        state_record.data = {}
        state_record.save()
        
        DriftBottle.objects.create(
            user=user,
            movie_title=movie_title,
            message=message
        )
        
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="漂流瓶已投遞出海，感謝你的推薦。"))
        return

    if text == '來部推薦':
        # 取得全海域漂流瓶總數
        total_bottles = DriftBottle.objects.count()
        
        # 排除自己的瓶子
        bottles_query = DriftBottle.objects.exclude(user=user)
        
        bottles = list(bottles_query)
        if not bottles:
            # 如果海裡有瓶子，只是剛好全都是自己的
            if total_bottles > 0:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="目前尚無其他影友投遞的漂流瓶，請稍後再來撈取。"))
            else:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="目前海域尚無漂流瓶，歡迎點擊「推薦電影」投遞第一個漂流瓶。"))
            return
            
        bottle = random.choice(bottles)
        
        # 紀錄次數與條件刪除
        bottle.fished_count += 1
        if total_bottles > 30 and bottle.fished_count >= 5:
            bottle.delete()
        else:
            bottle.save()
        
        try:
            nickname = bottle.user.profile.nickname
        except UserProfile.DoesNotExist:
            nickname = bottle.user.line_display_name or "匿名使用者"
            
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        flex = get_drift_bottle_recommend_flex(bottle, nickname, frontend_url)
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="你撈到了一個漂流瓶", contents=flex))
        return

    # --- Stateful Review Creation ---
    if text in ['寫心得', '發布感想']:
        state_record.state = "WAITING_FOR_REVIEW_TITLE"
        state_record.save()
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="請輸入欲分享的電影名稱：\n\n(回覆「取消」可中斷)"))
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
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="評分格式有誤，請輸入 1 至 5 的數字：\n\n(回覆「取消」可中斷)"))
            return
            
        rating = int(rating_text)
        state_record.data['review_rating'] = rating
        state_record.state = "WAITING_FOR_REVIEW_CONTENT"
        state_record.save()
        
        movie_title = state_record.data.get('review_title')
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"已記錄評分 {rating}.0 / 5.0。\n請輸入您的心得內文：\n\n(回覆「取消」可中斷)"))
        return
        
    if user_state == "WAITING_FOR_REVIEW_CONTENT":
        content = text.strip()
        state_record.data['review_content'] = content
        state_record.state = "WAITING_FOR_REVIEW_TAGS"
        state_record.save()
        
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="請為這篇心得加上標籤（以 # 開頭，如 #動作片 #好雷），若不需標籤請輸入「略過」：\n\n(回覆「取消」可中斷)"))
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
        from api.utils.tmdb import get_or_create_movie
        movie, _, tmdb_genres = get_or_create_movie(movie_title)
        
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
        all_genres = list(GENRE_MAP.items())
        random.shuffle(all_genres)
        genres_subset = all_genres[:10]
        
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        flex_carousel = get_speed_rate_genres_flex(genres_subset, frontend_url)
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
            badge_title = "資深影迷"
            badge_color = "#C5A059"
        elif level >= 2:
            badge_title = "進階影迷"
            badge_color = "#D4AF37"
        elif level >= 1:
            badge_title = "初級影迷"
            badge_color = "#AAAAAA"
        else:
            badge_title = "新晉影迷"
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
        
        # 經驗值進度條（用平滑 Box 視覺化）
        progress_percentage = int((current_exp / exp_needed) * 100) if exp_needed > 0 else 0
        progress_flex = progress_percentage if progress_percentage > 0 else 1
        remaining_flex = 100 - progress_percentage if progress_percentage < 100 else 1
        
        flex_card = {
            "type": "bubble",
            "size": "mega",
            "styles": {
                "header": { "backgroundColor": "#1A1A1A" },
                "body": { "backgroundColor": "#141414" },
                "footer": { "backgroundColor": "#181818" }
            },
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "影迷專屬名片",
                        "weight": "bold",
                        "color": "#F0F0F0",
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
                        "color": "#F0F0F0"
                    },
                    {"type": "separator", "margin": "lg", "color": "#262626"},
                    # 等級與經驗值
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {"type": "text", "text": f"Lv. {level}", "size": "md", "color": "#C5A059", "weight": "bold", "flex": 3},
                                    {"type": "text", "text": f"EXP {current_exp}/{exp_needed}", "size": "sm", "color": "#888888", "align": "end", "flex": 5}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "margin": "md",
                                "cornerRadius": "8px",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "vertical",
                                        "backgroundColor": "#C5A059",
                                        "height": "8px",
                                        "flex": progress_flex,
                                        "contents": []
                                    },
                                    {
                                        "type": "box",
                                        "layout": "vertical",
                                        "backgroundColor": "#2A2A2A",
                                        "height": "8px",
                                        "flex": remaining_flex,
                                        "contents": []
                                    }
                                ]
                            }
                        ],
                        "margin": "lg"
                    },
                    {"type": "separator", "margin": "lg", "color": "#262626"},
                    # 數據統計
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {"type": "text", "text": str(review_count), "size": "xl", "weight": "bold", "color": "#F0F0F0", "align": "center"},
                                    {"type": "text", "text": "發布心得", "size": "xs", "color": "#888888", "align": "center", "margin": "sm"}
                                ],
                                "flex": 1
                            },
                            {"type": "separator", "color": "#262626"},
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {"type": "text", "text": str(likes_received), "size": "xl", "weight": "bold", "color": "#F0F0F0", "align": "center"},
                                    {"type": "text", "text": "獲得肯定", "size": "xs", "color": "#888888", "align": "center", "margin": "sm"}
                                ],
                                "flex": 1
                            }
                        ],
                        "margin": "lg",
                        "paddingAll": "sm"
                    },
                    {"type": "separator", "margin": "lg", "color": "#262626"},
                    # 常用標籤
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {"type": "text", "text": "常用標籤", "size": "sm", "color": "#888888"},
                            {"type": "text", "text": tag_str, "size": "sm", "color": "#C5A059", "weight": "bold", "wrap": True, "margin": "sm"}
                        ],
                        "margin": "lg"
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "paddingAll": "md",
                "contents": [
                    {
                        "type": "text",
                        "text": "發布心得 +25 EXP ｜ 留言互動 +10 EXP ｜ 獲肯定 +1 EXP",
                        "size": "xxs",
                        "color": "#777777",
                        "wrap": True,
                        "align": "center"
                    }
                ]
            }
        }
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        btn_flex = get_website_button_flex(frontend_url)
        line_bot_api.reply_message(event.reply_token, [
            FlexSendMessage(alt_text="專屬影迷名片", contents=flex_card),
            FlexSendMessage(alt_text="前往映後時光", contents=btn_flex)
        ])
        return

    if text == '近期活動':
        events = Event.objects.filter(event_time__gte=timezone.now()).order_by('event_time')[:5]
        if not events:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="近期沒有活動喔！趕快來發起一個吧！"))
            return
            
        frontend_url = os.getenv('FRONTEND_URL', 'https://movie-reflection-sharing-project.vercel.app')
        flex_carousel = get_events_list_flex(events, f"{frontend_url}/events")
        line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="近期電影揪團", contents=flex_carousel))
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
            
            line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="熱門影評推薦", contents=flex_carousel))
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
            line_bot_api.reply_message(event.reply_token, FlexSendMessage(alt_text="揪團建立完成", contents=flex_card))
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
            
            reply_text = f"已成功加入【{event_obj.title}】。\n目前共有 {current_count} 人參加。"
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
            TextSendMessage(text="無法辨識此指令。您可以輸入片名與評分（例如：沙丘 5）、或輸入「/規則」查看詳細說明。")
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
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="系統設定異常：TMDB API Key 尚未設定，請聯繫管理員。"))
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
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"您已評價過《{movie_title}》。"))
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
            
        from api.utils.tmdb import get_or_create_movie
        movie, _, tmdb_genres = get_or_create_movie(movie_title)
        
        # Check if already exists to prevent spam
        existing_review = Review.objects.filter(user=user, movie=movie).first()
        if existing_review:
            if existing_review.rating == rating and existing_review.content == "":
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"您已為《{movie_title}》評過 {rating} 星。"))
            else:
                existing_review.rating = rating
                existing_review.save()
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"已將《{movie_title}》評分更新為 {rating} 星。\n(重複評分不另計經驗值)"))
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
        from api.models import Tag
        
        movie_tag, _ = Tag.objects.get_or_create(name=movie_title)
        review.tags.add(movie_tag)
        
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
        messages_to_send = [FlexSendMessage(alt_text="評分已記錄", contents=flex_bubble)]
        
        if next_movies_data:
            next_movies_flex = get_speed_rate_movies_carousel_flex(next_movies_data, genre_id)
            messages_to_send.append(FlexSendMessage(alt_text="為您推薦更多電影", contents=next_movies_flex))
            
        line_bot_api.reply_message(event.reply_token, messages_to_send)
        return
