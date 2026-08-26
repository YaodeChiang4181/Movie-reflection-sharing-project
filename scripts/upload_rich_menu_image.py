import os
import sys
from dotenv import load_dotenv
from linebot import LineBotApi
from linebot.models import (
    RichMenu, RichMenuSize, RichMenuArea, RichMenuBounds,
    URIAction, MessageAction
)

load_dotenv()

line_channel_access_token = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
liff_base_url = os.getenv('LIFF_BASE_URL', 'https://liff.line.me/YOUR_LIFF_ID')

if not line_channel_access_token:
    print("錯誤: 未設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數")
    sys.exit(1)

line_bot_api = LineBotApi(line_channel_access_token)
image_path = '使用者介面卡片.png'

# 1. 建立全新的 Rich Menu
rich_menu_to_create = RichMenu(
    size=RichMenuSize(width=2500, height=1686),
    selected=True,
    name="映後時光 主選單",
    chat_bar_text="打開選單",
    areas=[
        RichMenuArea(bounds=RichMenuBounds(x=0, y=0, width=833, height=843), action=MessageAction(label='寫心得', text='寫心得')),
        RichMenuArea(bounds=RichMenuBounds(x=833, y=0, width=834, height=843), action=MessageAction(label='影迷名片', text='影迷名片')),
        RichMenuArea(bounds=RichMenuBounds(x=1667, y=0, width=833, height=843), action=MessageAction(label='發起揪團', text='我要揪團')),
        RichMenuArea(bounds=RichMenuBounds(x=0, y=843, width=833, height=843), action=MessageAction(label='特映專區', text='近期活動')),
        RichMenuArea(bounds=RichMenuBounds(x=833, y=843, width=834, height=843), action=MessageAction(label='快速查詢', text='查')),
        RichMenuArea(bounds=RichMenuBounds(x=1667, y=843, width=833, height=843), action=MessageAction(label='熱門影評', text='熱門影評'))
    ]
)

try:
    print("正在向 LINE 註冊一個全新的 Rich Menu...")
    rich_menu_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_to_create)
    print(f"✅ 成功建立新 Rich Menu, ID: {rich_menu_id}")

    print(f"正在上傳最新圖片 {image_path}...")
    with open(image_path, 'rb') as f:
        line_bot_api.set_rich_menu_image(rich_menu_id, 'image/png', f)
    
    print("圖片上傳成功！正在設定為所有用戶的預設選單...")
    line_bot_api.set_default_rich_menu(rich_menu_id)
    
    print("✅ 設定完成！舊版選單已被取代，請打開手機的 LINE 官方帳號查看新選單！")
except Exception as e:
    print(f"❌ 發生錯誤: {e}")
