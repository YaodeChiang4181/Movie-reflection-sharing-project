import os
import re
import random
import string
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from linebot import LineBotApi, WebhookHandler
from linebot.models import MessageEvent, TextMessage, TextSendMessage
from linebot.exceptions import InvalidSignatureError, LineBotApiError
from rest_framework_simplejwt.tokens import RefreshToken
import urllib.parse

from dotenv import load_dotenv

from .models import User, Review, Movie, Event

load_dotenv()
line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN', ''))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET', ''))

def generate_random_campus_id():
    # 產生9碼隨機英數字
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

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # LINE Verify 測試會發送假的 replyToken，直接忽略避免噴錯
    if event.reply_token == '00000000000000000000000000000000' or event.reply_token == 'ffffffffffffffffffffffffffffffff':
        return

    text = event.message.text.strip()
    line_user_id = event.source.user_id
    
    # 取得 LINE 顯示名稱
    try:
        profile = line_bot_api.get_profile(line_user_id)
        display_name = profile.display_name
    except:
        display_name = "LINE User"

    # 說明指令 (/)
    if text == '/' or text == '/規則':
        rules_text = (
            "🎬 【影像製作所 Bot 指令規則】\n\n"
            "📝 發布心得格式：\n"
            "#心得\n"
            "電影：[名稱]\n"
            "評分：[1-5]\n"
            "心得：[內容]\n\n"
            "🔍 搜尋電影評價：\n"
            "查 [電影名稱]\n\n"
            "📅 尋找近期活動：\n"
            "揪團 或 近期活動\n\n"
            "🔗 舊用戶綁定：\n"
            "#綁定 [學號/Email] [密碼]"
        )
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=rules_text))
        return

    # 0. 綁定帳號邏輯 (優先處理，避免自動創立輕量帳號時佔用 line_user_id)
    if text.startswith('#綁定'):
        parts = text.split()
        if len(parts) >= 3:
            username_input = parts[1]
            password = parts[2]
            
            target_user = None
            if '@' in username_input:
                # 校外人士使用 Email 綁定
                from .models import OutsiderIdentity
                outsider = OutsiderIdentity.objects.filter(email=username_input).first()
                if outsider:
                    target_user = outsider.user
            else:
                # 校內學生使用學號綁定
                target_user = User.objects.filter(campus_id=username_input).first()
                
            if target_user and target_user.check_password(password):
                # 檢查是否已經被別人綁定
                if target_user.line_user_id and target_user.line_user_id != line_user_id:
                    line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 此帳號已被其他 LINE 綁定！"))
                    return
                    
                # 處理原本可能存在的輕量帳號
                old_user = User.objects.filter(line_user_id=line_user_id).first()
                if old_user and old_user.campus_id != target_user.campus_id:
                    if old_user.reviews.count() == 0:
                        old_user.delete()
                    else:
                        old_user.line_user_id = None
                        old_user.save()
                        
                target_user.line_user_id = line_user_id
                target_user.line_display_name = display_name
                target_user.save()
                
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"✅ 帳號綁定成功！歡迎回來，{target_user.username or target_user.campus_id}。"))
            else:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="❌ 帳號或密碼錯誤，請重新確認！"))
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="綁定格式錯誤，請輸入：\n#綁定 [您的學號/Email] [密碼]"))
        return

    # 取得或創建使用者 (一般發文邏輯)
    user = User.objects.filter(line_user_id=line_user_id).first()
    if not user:
        # 建立輕量帳號
        campus_id = generate_random_campus_id()
        user = User.objects.create(
            campus_id=campus_id,
            line_user_id=line_user_id,
            line_display_name=display_name,
            username=display_name
        )

    # 1. 發布心得
    if text.startswith('#心得'):
        movie_match = re.search(r'電影：([^\n]+)', text)
        rating_match = re.search(r'評分：(\d+)', text)
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
            
            # 使用環境變數或寫死的前端網址
            frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
            reply_text = f"發布成功！感謝您的分享。\n\n點擊查看您的心得頁面：{frontend_url}/reviews/{review.id}\n\n💡 忘記指令？輸入「/」即可查看規則喔！"
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply_text))
            return
        else:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="心得格式錯誤，請使用：\n#心得\n電影：[名稱]\n評分：[1-5]\n心得：[內容]"))
            return
            
    # 2. 搜尋心得
    if text.startswith('查 ') or text.startswith('搜尋 '):
        keyword = text.split(' ', 1)[1].strip()
        reviews = Review.objects.filter(movie__title__icontains=keyword, is_deleted=False).order_by('-created_at')[:5]
        
        if not reviews:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"找不到關於「{keyword}」的心得。"))
            return
            
        reply_lines = [f"🔍 「{keyword}」的心得搜尋結果："]
        for r in reviews:
            reply_lines.append(f"- {r.movie.title} ({r.rating}星): {r.content[:20]}...")
            
        # 產生自動登入與跳轉網址
        if user:
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
            encoded_keyword = urllib.parse.quote(keyword)
            search_link = f"{frontend_url}/search?q={encoded_keyword}&token={access_token}"
            reply_lines.append(f"\n🔗 點此前往網頁查看並自動登入：\n{search_link}")
            
        reply_lines.append("\n💡 忘記指令？輸入「/」即可查看規則喔！")
        
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
        return
        
    # 3. 揪電影活動
    if text in ['揪團', '近期活動']:
        events = Event.objects.filter(event_time__gte=timezone.now()).order_by('event_time')[:5]
        if not events:
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="近期沒有活動喔！趕快來發起一個吧！"))
            return
            
        reply_lines = ["📅 近期揪電影活動："]
        for e in events:
            # 轉換為本地時間顯示 (假設 timezone 已經設為台北)
            time_str = e.event_time.strftime('%m/%d %H:%M')
            reply_lines.append(f"- [{time_str}] {e.title}\n  地點: {e.location}\n  發起人: {e.organizer_nickname}")
            
        reply_lines.append("\n💡 忘記指令？輸入「/」即可查看規則喔！")
            
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
        return

    # 若無法辨識的指令，可選擇不回應或給予提示
    try:
        line_bot_api.reply_message(
            event.reply_token, 
            TextSendMessage(text="無法辨識指令，可試試：「#心得」、「查 [電影名稱]」、「近期活動」。\n\n💡 忘記指令？輸入「/」即可查看規則喔！")
        )
    except LineBotApiError:
        pass

