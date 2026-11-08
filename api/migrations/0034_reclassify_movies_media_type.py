import urllib.request
import json
from django.db import migrations
from django.core.cache import cache


def reclassify_movies(apps, schema_editor):
    Movie = apps.get_model('api', 'Movie')
    
    # 1. 優先精準修復明確為動畫電影之作品（例如《天外奇蹟》/ Up 等）
    known_animated_movies = [
        '天外奇蹟', 'Up', '沖天救兵', '飛屋環遊記',
        '玩具總動員', 'Toy Story', '可可夜總會', 'Coco',
        '海底總動員', 'Finding Nemo', '怪獸電力公司', 'Monsters, Inc.',
        '瓦力', 'WALL·E', '料理鼠王', 'Ratatouille',
        '靈魂急轉彎', 'Soul', '腦筋急轉彎', 'Inside Out',
        '動物方城市', 'Zootopia', '冰雪奇緣', 'Frozen',
        '獅子王', 'The Lion King', '海洋奇緣', 'Moana',
        '神隱少女', 'Spirited Away', '霍爾的移動城堡', 'Howl\'s Moving Castle',
        '龍貓', 'My Neighbor Totoro', '你的名字。', 'Your Name.',
        '天氣之子', 'Weathering with You', '鈴芽之旅', 'Suzume',
        '蒼鷺與少年', 'The Boy and the Heron', '蜘蛛人：新宇宙', 'Spider-Man: Into the Spider-Verse',
        '蜘蛛人：穿越新宇宙', 'Spider-Man: Across the Spider-Verse'
    ]

    for title in known_animated_movies:
        Movie.objects.filter(title__iexact=title, media_type='anime').update(media_type='movie')
        Movie.objects.filter(original_title__iexact=title, media_type='anime').update(media_type='movie')

    # 2. 針對其餘仍被標為 'anime' 且帶有 tmdb_id 的作品，向 TMDB 進行輕量快速探測
    # 若在 /movie/{tmdb_id} 端點能成功獲取且非 TV 系列，則校正為 'movie'
    api_key = '9f47183d5f6d186439851ec7c0555109'
    candidates = Movie.objects.filter(media_type='anime', tmdb_id__isnull=False)[:50]

    for m in candidates:
        try:
            url = f"https://api.themoviedb.org/3/movie/{m.tmdb_id}?api_key={api_key}&language=zh-TW"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                # 若 TMDB 成功回傳且具有 title 或 release_date (電影特徵)
                if data.get('title') or data.get('release_date'):
                    m.media_type = 'movie'
                    m.save(update_fields=['media_type'])
        except Exception:
            # 容錯處理：若是 404 代表確實不是 movie（可能是 tv / anime 影集），保持原樣不中斷 migration
            continue

    # 3. 清除雲端快取，確保首頁專區與個人數據即時更新
    cache_keys = [
        'trending_reviews', 
        'top_20_movie_ids', 
        'tmdb_speed_pool', 
        'speed_rating_local_active_movies'
    ]
    for k in cache_keys:
        try:
            cache.delete(k)
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0033_cleanup_duplicate_rapid_ratings'),
    ]

    operations = [
        migrations.RunPython(reclassify_movies, migrations.RunPython.noop),
    ]
