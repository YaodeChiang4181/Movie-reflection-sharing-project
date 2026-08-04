import os
import re
import random
import string
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
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
    text = event.message.text.strip()
    line_user_id = event.source.user_id
    
    # 取得或創建使用者
    user = User.objects.filter(line_user_id=line_user_id).first()
    if not user:
        # 取得 LINE 顯示名稱
        try:
            profile = line_bot_api.get_profile(line_user_id)
            display_name = profile.display_name
        except:
            display_name = "LINE User"
            
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
            reply_text = f"發布成功！感謝您的分享。\n\n點擊查看您的心得頁面：{frontend_url}/reviews/{review.id}"
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
            
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text='\n'.join(reply_lines)))
        return

    # 若無法辨識的指令，可選擇不回應或給予提示
    line_bot_api.reply_message(
        event.reply_token, 
        TextSendMessage(text="無法辨識指令，可試試：「#心得」、「查 [電影名稱]」、「近期活動」。")
    )
