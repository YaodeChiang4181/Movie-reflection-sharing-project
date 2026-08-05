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

def clean_text_from_line(event):
    """
    過濾 LINE 專屬表情貼 (避免在網站上顯示為 $ 符號) 以及不可見控制字元，
    保留一般文字與標準 Unicode 表情符號 (😊)
    """
    text = event.message.text
    if getattr(event.message, 'emojis', None):
        # 將表情貼依照 index 反向排序，這樣刪除時才不會影響前面字元的 index
        emojis = sorted(event.message.emojis, key=lambda x: x.index, reverse=True)
        for emoji in emojis:
            start = emoji.index
            end = emoji.index + emoji.length
            text = text[:start] + text[end:]
    
    # 過濾掉不可見的控制字元 (保留換行 \n)
    text = ''.join(char for char in text if char.isprintable() or char == '\n')
    return text.strip()

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # LINE Verify 測試會發送假的 replyToken，直接忽略避免噴錯
    if event.reply_token == '00000000000000000000000000000000' or event.reply_token == 'ffffffffffffffffffffffffffffffff':
        return

    text = clean_text_from_line(event)
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
            "電影：奧德賽\n"
            "評分：5\n"
            "心得：這部電影太好看了！\n"
            "(請直接接文字，不要打括號喔)\n\n"
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
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="綁定格式錯誤，請參考範例 (中間要有空格，不需括號)：\n#綁定 a12345678 mypassword"))
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
        
        # 建立隨機公開暱稱 (UserProfile)
        random_nickname = f"User_{''.join(random.choices(string.ascii_letters + string.digits, k=6))}"
        from .models import UserProfile
        UserProfile.objects.create(user=user, nickname=random_nickname)

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
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text="心得格式錯誤，請參考範例 (不需打括號)：\n#心得\n電影：奧德賽\n評分：5\n心得：真的很好看！"))
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
            refresh_token = str(refresh)
            frontend_url = os.getenv('FRONTEND_URL', 'https://your-domain.com')
            encoded_keyword = urllib.parse.quote(keyword)
            search_link = f"{frontend_url}/search?q={encoded_keyword}&token={access_token}&refresh={refresh_token}"
            reply_lines.append(f"\n🔗 點此前往網頁查看並自動登入：\n{search_link}")
            
        reply_lines.append("\n💡 忘記指令？輸入「/」即可查看規則喔！")
        
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
        return
        
    # 3. 搜尋近期活動
    if text == '近期活動':
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

    # 4. 發起揪團活動
    if text.startswith('#揪團'):
        title_match = re.search(r'活動：([^\n]+)', text)
        time_match = re.search(r'時間：([^\n]+)', text)
        location_match = re.search(r'地點：([^\n]+)', text)
        description_match = re.search(r'描述：(.+)', text, re.DOTALL)
        
        if title_match and time_match and location_match:
            title = title_match.group(1).strip()
            time_str = time_match.group(1).strip()
            location = location_match.group(1).strip()
            description = description_match.group(1).strip() if description_match else ""
            
            from datetime import datetime
            from django.utils.timezone import make_aware
            
            try:
                # 假設使用者輸入格式為 YYYY-MM-DD HH:MM 或 YYYY/MM/DD HH:MM
                time_str_clean = time_str.replace('/', '-')
                event_time = datetime.strptime(time_str_clean, '%Y-%m-%d %H:%M')
                event_time = make_aware(event_time)
            except ValueError:
                line_bot_api.reply_message(event.reply_token, TextSendMessage(text="時間格式錯誤，請使用 YYYY-MM-DD HH:MM 格式，例如：2024-12-31 19:00"))
                return
            
            # 取得發起人暱稱
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

    # 若無法辨識的指令，可選擇不回應或給予提示
    try:
        line_bot_api.reply_message(
            event.reply_token, 
            TextSendMessage(text="無法辨識指令，可試試：「#心得」、「查 奧德賽」、「近期活動」、「#揪團」。\n\n💡 忘記指令？輸入「/」即可查看規則喔！")
        )
    except LineBotApiError:
        pass

