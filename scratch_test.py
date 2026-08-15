import re
from datetime import datetime

texts = [
    "#揪團\n活動：【看蜘蛛人】\n時間：【2026-8-31 18:00】\n地點：【中央大學校門口】\n描述：【一起看電影】",
    "#揪團\n活動：看蜘蛛人\n時間：2026-8-31 18:00\n地點：中央大學校門口\n描述：一起看電影"
]

for text in texts:
    print("Testing text:", text.replace("\n", "\\n"))
    title_match = re.search(r'活動：([^\n]+)', text)
    time_match = re.search(r'時間：([^\n]+)', text)
    location_match = re.search(r'地點：([^\n]+)', text)
    description_match = re.search(r'描述：(.+)', text, re.DOTALL)

    if title_match and time_match and location_match:
        title = title_match.group(1).strip()
        time_str = time_match.group(1).strip()
        location = location_match.group(1).strip()
        description = description_match.group(1).strip() if description_match else ""

        print("  Matched title:", title)
        print("  Matched time:", time_str)
        print("  Matched location:", location)

        try:
            time_str_clean = time_str.replace('/', '-')
            event_time = datetime.strptime(time_str_clean, '%Y-%m-%d %H:%M')
            print("  Time parsed successfully:", event_time)
        except ValueError as e:
            print("  ValueError raised:", e)
        except Exception as e:
            print("  Other exception raised:", e)
    else:
        print("  Regex failed to match!")
