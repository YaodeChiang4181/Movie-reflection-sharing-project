"""
標記現有的 TMDB genre 標籤和系統內建標籤為 is_system=True
執行方式：python manage.py shell < scripts/mark_system_tags.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Tag

# TMDB 常見 genre 中文名稱（依據 TMDB API zh-TW 回傳）
TMDB_GENRES = [
    '動作', '冒險', '動畫', '喜劇', '犯罪', '紀錄', '劇情', '家庭',
    '奇幻', '歷史', '恐怖', '音樂', '懸疑', '愛情', '科幻', '電視電影',
    '驚悚', '戰爭', '西部',
    # 英文 fallback（以防 TMDB 回傳英文）
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
    'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western',
]

# 系統內建標籤
SYSTEM_TAGS = ['急速評星', '熱門討論', '社群精選', '新鮮討論', '冷門話題']

all_system_names = set(TMDB_GENRES + SYSTEM_TAGS)
updated = Tag.objects.filter(name__in=all_system_names).update(is_system=True)
print(f"✅ 已標記 {updated} 個系統標籤為 is_system=True")
