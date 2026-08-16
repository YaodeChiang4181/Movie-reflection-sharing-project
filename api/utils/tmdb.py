import urllib.request
import urllib.parse
import json
import random
from django.conf import settings

GENRE_MAP = {
    28: "動作",
    12: "冒險",
    16: "動畫",
    35: "喜劇",
    80: "犯罪",
    99: "紀錄片",
    18: "劇情",
    10751: "家庭",
    14: "奇幻",
    36: "歷史",
    27: "恐怖",
    10402: "音樂",
    9648: "懸疑",
    10749: "愛情",
    878: "科幻",
    10770: "電視電影",
    53: "驚悚",
    10752: "戰爭",
    37: "西部"
}

def fetch_movie_genres(movie_title):
    """
    Fetch up to 5 genre tags from TMDB for a given movie title.
    Returns a list of strings (genre names).
    """
    api_key = getattr(settings, 'TMDB_API_KEY', '')
    if not api_key:
        return []

    try:
        query = urllib.parse.quote(movie_title)
        url = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&language=zh-TW&query={query}&page=1"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if data.get('results') and len(data['results']) > 0:
                first_result = data['results'][0]
                genre_ids = first_result.get('genre_ids', [])
                
                # Map genre IDs to names
                genres = [GENRE_MAP[gid] for gid in genre_ids if gid in GENRE_MAP]
                return genres[:5]
                
    except Exception as e:
        # In case of any error (network, TMDB changes, etc), return empty list 
        # so it doesn't break the review creation process
        print(f"TMDB Fetch Error: {e}")
        pass
        
    return []

def fetch_random_movie_by_genre(genre_id):
    """
    Fetch a random popular movie from TMDB for a given genre_id.
    Returns a dict with 'title' and 'poster_url' (or None if failed).
    """
    api_key = getattr(settings, 'TMDB_API_KEY', '')
    if not api_key:
        return None

    # 重試機制，最多試 2 次
    for attempt in range(2):
        try:
            # 為了隨機性，我們在最熱門的前 5 頁中隨機抽一頁
            page = random.randint(1, 5)
            url = f"https://api.themoviedb.org/3/discover/movie?api_key={api_key}&language=zh-TW&with_genres={genre_id}&sort_by=popularity.desc&page={page}"
            
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            # 放寬 timeout 到 8 秒，避免 TMDB 偶發的延遲導致直接失敗
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                if data.get('results') and len(data['results']) > 0:
                    # 在該頁的 20 筆結果中隨機抽一部
                    movie = random.choice(data['results'])
                    
                    title = movie.get('title')
                    poster_path = movie.get('poster_path')
                    poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
                    
                    return {
                        'title': title,
                        'poster_url': poster_url,
                        'overview': movie.get('overview', '')
                    }
        except Exception as e:
            print(f"TMDB Discover Error on attempt {attempt + 1}: {e}")
            pass
            
    return None
