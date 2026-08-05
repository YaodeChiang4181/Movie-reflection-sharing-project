import os
from linebot import LineBotApi
from linebot.models import FlexSendMessage, TextSendMessage
from django.db.models import Q
from api.models import User, UserExperience

def push_targeted_campaign(tags=None, min_level=1, flex_bubble=None, text_msg=None):
    """
    精準推播服務：根據標籤與等級篩選用戶，並使用 multicast 進行推播。
    :param tags: list of str, 需要符合的標籤名稱列表
    :param min_level: int, 最低等級限制
    :param flex_bubble: dict, Flex Message 內容
    :param text_msg: str, 若無 Flex Message，則傳送純文字
    :return: 成功推播的用戶數量
    """
    line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN', ''))
    
    # 篩選已綁定 LINE 的使用者，且達到最低等級要求
    query = Q(line_user_id__isnull=False) & ~Q(line_user_id="")
    
    users = User.objects.filter(query).select_related('experience').prefetch_related('reviews__tags')
    
    target_line_ids = set()
    for user in users:
        try:
            level = user.experience.level
        except UserExperience.DoesNotExist:
            level = 1
            
        if level < min_level:
            continue
            
        # 若有指定標籤，則檢查該用戶是否有發布過包含該標籤的心得
        if tags:
            user_tags = set()
            for review in user.reviews.all():
                for tag in review.tags.all():
                    user_tags.add(tag.name)
            
            # 必須包含其中一個標籤才符合資格
            if not any(tag in user_tags for tag in tags):
                continue
                
        target_line_ids.add(user.line_user_id)
        
    target_line_ids = list(target_line_ids)
    
    if not target_line_ids:
        return 0
        
    # 建立要推播的訊息物件
    if flex_bubble:
        message = FlexSendMessage(alt_text="專屬特映會邀請函", contents=flex_bubble)
    elif text_msg:
        message = TextSendMessage(text=text_msg)
    else:
        return 0
        
    # LINE Multicast 限制每次最多 500 人
    # 我們將名單分批處理
    batch_size = 500
    for i in range(0, len(target_line_ids), batch_size):
        batch = target_line_ids[i:i + batch_size]
        line_bot_api.multicast(batch, message)
        
    return len(target_line_ids)
