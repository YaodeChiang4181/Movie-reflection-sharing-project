import urllib.request
import urllib.parse
import json
import random
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from api.models import Movie

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
                best_match = data['results'][0]
                for result in data['results']:
                    if result.get('title') == movie_title or result.get('original_title') == movie_title:
                        best_match = result
                        break
                        
                genre_ids = best_match.get('genre_ids', [])
                
                # Map genre IDs to names
                genres = [GENRE_MAP[gid] for gid in genre_ids if gid in GENRE_MAP]
                return genres[:5]
                
    except Exception as e:
        # In case of any error (network, TMDB changes, etc), return empty list 
        # so it doesn't break the review creation process
        print(f"TMDB Fetch Error: {e}")
        pass
        
    return []

def fetch_movie_metadata(movie_title):
    """
    Fetch TMDB metadata (id, original_title, genres, poster) for a given movie title.
    Returns a dict or None.
    """
    api_key = getattr(settings, 'TMDB_API_KEY', '')
    if not api_key:
        return None

    try:
        query = urllib.parse.quote(movie_title)
        url = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&language=zh-TW&query={query}&page=1"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if data.get('results') and len(data['results']) > 0:
                best_match = data['results'][0]
                for result in data['results']:
                    if result.get('title') == movie_title or result.get('original_title') == movie_title:
                        best_match = result
                        break

                genre_ids = best_match.get('genre_ids', [])
                genres = [GENRE_MAP[gid] for gid in genre_ids if gid in GENRE_MAP][:5]
                
                poster_path = best_match.get('poster_path')
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
                
                return {
                    'tmdb_id': best_match.get('id'),
                    'original_title': best_match.get('original_title'),
                    'genres': genres,
                    'poster_url': poster_url,
                }
    except Exception as e:
        print(f"TMDB Fetch Metadata Error: {e}")
        pass
        
    return None

def get_or_create_movie(movie_title):
    """
    Helper to get or create a Movie instance using TMDB metadata if available.
    Returns (Movie instance, created (bool), tmdb_genres (list))
    """
    tmdb_meta = fetch_movie_metadata(movie_title)
    tmdb_genres = tmdb_meta['genres'] if tmdb_meta else []
    
    movie_defaults = {'director': 'Unknown', 'release_year': timezone.now().year}
    if tmdb_meta:
        if tmdb_meta.get('original_title'):
            movie_defaults['original_title'] = tmdb_meta['original_title']
        if tmdb_meta.get('tmdb_id'):
            movie_defaults['tmdb_id'] = tmdb_meta['tmdb_id']
        if tmdb_meta.get('poster_url'):
            movie_defaults['poster_url'] = tmdb_meta['poster_url']
            
    movie, created = Movie.objects.get_or_create(
        title=movie_title,
        defaults=movie_defaults
    )
    return movie, created, tmdb_genres

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

def fetch_random_movies_by_genre(genre_id, count=3):
    """
    Fetch multiple random popular movies from TMDB for a given genre_id.
    If genre_id is 'popular', fetches general popular movies without genre filtering.
    Returns a list of dicts with 'title', 'poster_url', and 'overview'.
    """
    api_key = getattr(settings, 'TMDB_API_KEY', '')
    if not api_key:
        return []

    for attempt in range(2):
        try:
            page = random.randint(1, 5)
            if str(genre_id) == 'popular':
                url = f"https://api.themoviedb.org/3/movie/popular?api_key={api_key}&language=zh-TW&page={page}"
            else:
                url = f"https://api.themoviedb.org/3/discover/movie?api_key={api_key}&language=zh-TW&with_genres={genre_id}&sort_by=popularity.desc&page={page}"
            
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                if data.get('results') and len(data['results']) >= count:
                    movies = random.sample(data['results'], min(count, len(data['results'])))
                    result_list = []
                    for movie in movies:
                        title = movie.get('title')
                        poster_path = movie.get('poster_path')
                        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
                        
                        result_list.append({
                            'title': title,
                            'poster_url': poster_url,
                            'overview': movie.get('overview', '')
                        })
                    return result_list
        except Exception as e:
            print(f"TMDB Discover Multiple Error on attempt {attempt + 1}: {e}")
            pass
            
    return []

def search_tmdb_movies(query):
    """
    Search TMDB for movies matching the query.
    Returns a list of dicts with 'id', 'title', 'original_title', 'release_date', 'poster_url'.
    """
    api_key = getattr(settings, 'TMDB_API_KEY', '')
    if not api_key or not query.strip():
        return []

    try:
        encoded_query = urllib.parse.quote(query.strip())
        url = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&language=zh-TW&query={encoded_query}&page=1"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = []
            
            for item in data.get('results', [])[:10]:
                poster_path = item.get('poster_path')
                poster_url = f"https://image.tmdb.org/t/p/w200{poster_path}" if poster_path else None
                release_date = item.get('release_date', '')
                year = release_date.split('-')[0] if release_date else '未知年份'
                
                results.append({
                    'tmdb_id': item.get('id'),
                    'title': item.get('title'),
                    'original_title': item.get('original_title'),
                    'year': year,
                    'poster_url': poster_url,
                })
            return results
    except Exception as e:
        print(f"TMDB Search Error: {e}")
        
    return []

def fetch_movie_metadata_by_id(tmdb_id):
    """
    Fetch TMDB metadata exact match by tmdb_id.
    """
    api_key = getattr(settings, 'TMDB_API_KEY', '')
    if not api_key:
        return None

    try:
        url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={api_key}&language=zh-TW"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            genres = [g['name'] for g in data.get('genres', [])][:5]
            
            poster_path = data.get('poster_path')
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            
            return {
                'tmdb_id': data.get('id'),
                'title': data.get('title'),
                'original_title': data.get('original_title'),
                'genres': genres,
                'poster_url': poster_url,
            }
    except Exception as e:
        print(f"TMDB Fetch Metadata By ID Error: {e}")
        
    return None


def fetch_tmdb_popular_pool(pool_size=10):
    """
    Fetch and cache a pool of popular movies from TMDB.
    Uses Django Cache with key 'tmdb_speed_pool', TTL = 30 minutes.
    Returns a list of dicts with 'tmdb_id', 'title' (zh-TW), 'original_title', 'poster_url'.
    """
    CACHE_KEY = 'tmdb_speed_pool'
    cached = cache.get(CACHE_KEY)
    if cached:
        return cached

    api_key = getattr(settings, 'TMDB_API_KEY', '')
    if not api_key:
        return []

    try:
        # Fetch from 2 random pages to get a more diverse pool
        all_movies = []
        for _ in range(2):
            page = random.randint(1, 10)
            url = (
                f"https://api.themoviedb.org/3/movie/popular"
                f"?api_key={api_key}&language=zh-TW&page={page}"
            )
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode('utf-8'))
                for item in data.get('results', []):
                    tmdb_id = item.get('id')
                    title = item.get('title')
                    original_title = item.get('original_title')
                    poster_path = item.get('poster_path')
                    poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None

                    if tmdb_id and title:
                        all_movies.append({
                            'tmdb_id': tmdb_id,
                            'title': title,
                            'original_title': original_title or title,
                            'poster_url': poster_url,
                        })

        # Deduplicate by tmdb_id
        seen = set()
        unique = []
        for m in all_movies:
            if m['tmdb_id'] not in seen:
                seen.add(m['tmdb_id'])
                unique.append(m)

        # Shuffle and take pool_size
        random.shuffle(unique)
        pool = unique[:pool_size]

        # Cache for 30 minutes
        cache.set(CACHE_KEY, pool, timeout=1800)
        return pool

    except Exception as e:
        print(f"TMDB Popular Pool Fetch Error: {e}")
        return []
