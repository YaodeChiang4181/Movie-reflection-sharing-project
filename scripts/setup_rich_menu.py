import os
import sys
from dotenv import load_dotenv
from linebot import LineBotApi
from linebot.models import (
    RichMenu, RichMenuSize, RichMenuArea, RichMenuBounds,
    URIAction, MessageAction
)

# 載入專案根目錄的 .env 檔案
load_dotenv()

def create_and_set_rich_menu():
    line_channel_access_token = os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
    liff_base_url = os.getenv('LIFF_BASE_URL', 'https://liff.line.me/YOUR_LIFF_ID')
    
    if not line_channel_access_token:
        print("錯誤: 未設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數")
        sys.exit(1)
        
    line_bot_api = LineBotApi(line_channel_access_token)
    
    # 定義 Rich Menu: 6格版面 (寬 2500, 高 1686)
    rich_menu_to_create = RichMenu(
        size=RichMenuSize(width=2500, height=1686),
        selected=True,
        name="影像製作所 主選單",
        chat_bar_text="打開選單",
        areas=[
            # 左上: 寫心得 (開啟 LIFF 表單)
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=0, width=833, height=843),
                action=URIAction(label='寫心得', uri=f'{liff_base_url}/liff/review-form')
            ),
            # 中上: 我的影迷名片 (開啟 LIFF 雷達圖)
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=0, width=834, height=843),
                action=URIAction(label='影迷名片', uri=f'{liff_base_url}/liff/profile')
            ),
            # 右上: 發起揪團 (觸發文字指令)
            RichMenuArea(
                bounds=RichMenuBounds(x=1667, y=0, width=833, height=843),
                action=MessageAction(label='發起揪團', text='我要揪團')
            ),
            # 左下: 個人特映專區 (觸發文字推播或 LIFF)
            RichMenuArea(
                bounds=RichMenuBounds(x=0, y=843, width=833, height=843),
                action=MessageAction(label='特映專區', text='近期活動')
            ),
            # 中下: (備用欄位) 查奧德賽
            RichMenuArea(
                bounds=RichMenuBounds(x=833, y=843, width=834, height=843),
                action=MessageAction(label='快速查詢', text='查 奧德賽')
            ),
            # 右下: 探索熱門影評
            RichMenuArea(
                bounds=RichMenuBounds(x=1667, y=843, width=833, height=843),
                action=MessageAction(label='熱門影評', text='熱門影評')
            )
        ]
    )
    
    try:
        # 1. 建立 Rich Menu 並取得 ID
        rich_menu_id = line_bot_api.create_rich_menu(rich_menu=rich_menu_to_create)
        print(f"✅ 成功建立 Rich Menu, ID: {rich_menu_id}")
        
        # 2. 說明接下來的步驟 (上傳圖片)
        print("\n後續實務步驟：")
        print(f"1. 請準備一張 2500x1686 像素的底圖 (例如 rich_menu_bg.jpg)")
        print(f"2. 透過以下程式碼將圖片上傳綁定：")
        print(f"   with open('rich_menu_bg.jpg', 'rb') as f:")
        print(f"       line_bot_api.set_rich_menu_image('{rich_menu_id}', 'image/jpeg', f)")
        print(f"3. 啟用為預設選單：")
        print(f"   line_bot_api.set_default_rich_menu('{rich_menu_id}')")
        
    except Exception as e:
        print(f"❌ 建立失敗: {e}")

if __name__ == "__main__":
    create_and_set_rich_menu()
