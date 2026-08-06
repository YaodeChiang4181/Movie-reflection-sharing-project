import os
import sys
from dotenv import load_dotenv
from linebot import LineBotApi

load_dotenv()

line_channel_access_token = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
if not line_channel_access_token:
    print("錯誤: 未設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數")
    sys.exit(1)

line_bot_api = LineBotApi(line_channel_access_token)
rich_menu_id = 'richmenu-1d3bfc0ba0036c6c97e49e237887bb71'
image_path = '使用者介面卡片.png'

try:
    print(f"正在上傳圖片 {image_path} 到 Rich Menu {rich_menu_id}...")
    with open(image_path, 'rb') as f:
        line_bot_api.set_rich_menu_image(rich_menu_id, 'image/png', f)
    
    print("圖片上傳成功！正在設定為預設選單...")
    line_bot_api.set_default_rich_menu(rich_menu_id)
    
    print("✅ 設定完成！現在請打開手機的 LINE 官方帳號查看選單！")
except Exception as e:
    print(f"❌ 發生錯誤: {e}")
