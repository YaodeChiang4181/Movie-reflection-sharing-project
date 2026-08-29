import urllib.request
import urllib.error

url = 'https://movie-platform-backend-lyk1.onrender.com/api/cron/daily-digest/'
headers = {'Authorization': 'Bearer my-super-secret-cron-key-0607'}

print("正在發送請求至 Render...")
req = urllib.request.Request(url, headers=headers)

try:
    response = urllib.request.urlopen(req)
    print("✅ 成功！伺服器回應：")
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"❌ 錯誤 (HTTP {e.code})：")
    print(e.read().decode('utf-8'))
except Exception as e:
    print("❌ 未知錯誤：", e)
