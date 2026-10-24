import urllib.request
import urllib.parse
import json
import random
import re
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
    37: "西部",
    10759: "動作冒險",
    10762: "兒童",
    10763: "新聞",
    10764: "真人秀",
    10765: "科幻奇幻",
    10766: "肥皂劇",
    10767: "脫口秀",
    10768: "戰爭政治"
}

def determine_media_type(item):
    """
    Determine whether a TMDB item should be categorized as 'anime', 'tv', or 'movie'.
    - If genre 16 ('動畫' / 'Animation') is present in genre_ids or genres -> 'anime'
    - Else if media_type == 'tv' -> 'tv'
    - Else -> 'movie'
    """
    if not item:
        return 'movie'
    
    genre_ids = item.get('genre_ids') or []
    if not genre_ids and item.get('genres'):
        genre_ids = [g.get('id') for g in item.get('genres') if isinstance(g, dict) and g.get('id')]
        
    if 16 in genre_ids:
        return 'anime'
        
    tmdb_type = item.get('media_type')
    if tmdb_type == 'tv':
        return 'tv'
    return 'movie'

DEFAULT_TMDB_API_KEY = '9f47183d5f6d186439851ec7c0555109'

def get_tmdb_api_key():
    return getattr(settings, 'TMDB_API_KEY', '') or DEFAULT_TMDB_API_KEY

def _search_tmdb(movie_title_raw):
    """
    Helper to search TMDB for a movie or TV show.
    Handles year extraction and case-insensitive exact matching.
    """
    api_key = get_tmdb_api_key()
    if not api_key:
        return None

    # 1. 嘗試從標題中提取年份 (如 1997 或 2026)
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', movie_title_raw)
    year = None
    search_query = movie_title_raw
    if year_match:
        year = year_match.group(1)
        search_query = re.sub(r'\b' + year + r'\b', '', movie_title_raw).strip()
        search_query = re.sub(r'[\(\)\[\]]', '', search_query).strip() 
        
    if not search_query:
        search_query = movie_title_raw

    try:
        query = urllib.parse.quote(search_query)
        # 使用 search/multi 來同時搜尋電影與影集 (miniseries)
        url = f"https://api.themoviedb.org/3/search/multi?api_key={api_key}&language=zh-TW&query={query}&page=1"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if data.get('results'):
                # 排除人物
                valid_results = [r for r in data['results'] if r.get('media_type') in ['movie', 'tv']]
                if not valid_results:
                    return None
                
                # 先按 vote_count 排序，相同名稱時優先選評分人數較多的 (避免抓到假的、低知名度的項目)
                valid_results.sort(key=lambda x: x.get('vote_count') or 0, reverse=True)
                    
                best_match = None
                
                if year:
                    # 如果有指定年份，尋找年份相符的項目
                    for result in valid_results:
                        release_date = result.get('release_date') or result.get('first_air_date') or ''
                        if release_date.startswith(year):
                            best_match = result
                            break
                    if not best_match:
                        best_match = valid_results[0]
                else:
                    # 尋找完全符合名稱的項目 (大小寫不拘)
                    for result in valid_results:
                        t1 = (result.get('title') or result.get('name') or '').upper()
                        t2 = (result.get('original_title') or result.get('original_name') or '').upper()
                        q_upper = search_query.upper()
                        if t1 == q_upper or t2 == q_upper:
                            best_match = result
                            break
                    if not best_match:
                        best_match = valid_results[0]
                        
                return best_match
    except Exception as e:
        print(f"TMDB Search Error: {e}")
    return None

def fetch_movie_genres(movie_title):
    """
    Fetch up to 5 genre tags from TMDB for a given movie title.
    Returns a list of strings (genre names).
    """
    best_match = _search_tmdb(movie_title)
    if best_match:
        genre_ids = best_match.get('genre_ids', [])
        return [GENRE_MAP[gid] for gid in genre_ids if gid in GENRE_MAP][:5]
    return []

def fetch_movie_metadata(movie_title):
    """
    Fetch TMDB metadata (id, original_title, genres, poster) for a given movie title.
    Returns a dict or None.
    """
    best_match = _search_tmdb(movie_title)
    if best_match:
        genre_ids = best_match.get('genre_ids', [])
        genres = [GENRE_MAP[gid] for gid in genre_ids if gid in GENRE_MAP][:5]
        
        poster_path = best_match.get('poster_path')
        tmdb_id = best_match.get('id')
        media_type = best_match.get('media_type', 'movie')
        
        # 嘗試優先取得 zh-TW 或 en 的海報，避免出現簡體中文海報
        api_key = getattr(settings, 'TMDB_API_KEY', '')
        if api_key and tmdb_id:
            try:
                url = f"https://api.themoviedb.org/3/{media_type}/{tmdb_id}/images?api_key={api_key}&include_image_language=zh-TW,en,null"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=3) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    if data.get('posters') and len(data['posters']) > 0:
                        poster_path = data['posters'][0]['file_path']
            except Exception as e:
                print(f"TMDB Images Fetch Error: {e}")

        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
        release_date = best_match.get('release_date') or best_match.get('first_air_date') or ''
        release_year = None
        if release_date:
            try:
                release_year = int(release_date.split('-')[0])
            except:
                pass

        classified_type = determine_media_type(best_match)

        return {
            'tmdb_id': tmdb_id,
            'original_title': best_match.get('original_title') or best_match.get('original_name'),
            'localized_title': best_match.get('title') or best_match.get('name'),
            'genres': genres,
            'poster_url': poster_url,
            'release_year': release_year,
            'media_type': classified_type,
        }
    return None

def get_or_create_movie(movie_title, media_type_hint=None):
    """
    Helper to get or create a Movie instance using TMDB metadata if available.
    Returns (Movie instance, created (bool), tmdb_genres (list))
    """
    tmdb_meta = fetch_movie_metadata(movie_title)
    tmdb_genres = tmdb_meta['genres'] if tmdb_meta else []
    
    movie_defaults = {
        'director': '', 
        'release_year': timezone.now().year,
        'media_type': media_type_hint or 'movie'
    }
    
    final_title = movie_title
    
    if tmdb_meta:
        if tmdb_meta.get('localized_title'):
            final_title = tmdb_meta['localized_title']
        if tmdb_meta.get('original_title'):
            movie_defaults['original_title'] = tmdb_meta['original_title']
        if tmdb_meta.get('tmdb_id'):
            movie_defaults['tmdb_id'] = tmdb_meta['tmdb_id']
        if tmdb_meta.get('poster_url'):
            movie_defaults['poster_url'] = tmdb_meta['poster_url']
        if tmdb_meta.get('release_year'):
            movie_defaults['release_year'] = tmdb_meta['release_year']
        if tmdb_meta.get('media_type'):
            movie_defaults['media_type'] = tmdb_meta['media_type']
            
    # Try to find existing movie by tmdb_id to avoid duplicates from different query inputs
    if tmdb_meta and tmdb_meta.get('tmdb_id'):
        movie = Movie.objects.filter(tmdb_id=tmdb_meta['tmdb_id']).first()
        if movie:
            updated = False
            if movie.title != final_title:
                movie.title = final_title
                updated = True
            if 'original_title' in movie_defaults and movie.original_title != movie_defaults['original_title']:
                movie.original_title = movie_defaults['original_title']
                updated = True
            if 'media_type' in movie_defaults and movie.media_type != movie_defaults['media_type']:
                movie.media_type = movie_defaults['media_type']
                updated = True
            if updated:
                movie.save(update_fields=['title', 'original_title', 'media_type'])
            return movie, False, tmdb_genres
            
    movie, created = Movie.objects.get_or_create(
        title=final_title,
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
    Search TMDB for movies, TV series, and anime matching the query.
    Returns a list of dicts with 'id', 'title', 'original_title', 'release_date', 'poster_url', 'media_type', 'media_type_label'.
    """
    api_key = get_tmdb_api_key()
    if not api_key or not query.strip():
        return []

    try:
        encoded_query = urllib.parse.quote(query.strip())
        url = f"https://api.themoviedb.org/3/search/multi?api_key={api_key}&language=zh-TW&query={encoded_query}&page=1"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = []
            
            raw_results = [r for r in data.get('results', []) if r.get('media_type') in ['movie', 'tv']]
            
            type_labels = {'movie': '電影', 'tv': '影集', 'anime': '動漫'}
            for item in raw_results[:12]:
                poster_path = item.get('poster_path')
                poster_url = f"https://image.tmdb.org/t/p/w200{poster_path}" if poster_path else None
                release_date = item.get('release_date') or item.get('first_air_date') or ''
                year = release_date.split('-')[0] if release_date else '未知年份'
                
                title = item.get('title') or item.get('name') or ''
                original_title = item.get('original_title') or item.get('original_name') or ''
                classified_type = determine_media_type(item)
                
                results.append({
                    'tmdb_id': item.get('id'),
                    'id': item.get('id'),
                    'title': title,
                    'original_title': original_title,
                    'year': year,
                    'release_year': year,
                    'poster_url': poster_url,
                    'media_type': classified_type,
                    'media_type_label': type_labels.get(classified_type, '電影')
                })
            return results
    except Exception as e:
        print(f"TMDB Search Error: {e}")
        
    return []

def fetch_movie_metadata_by_id(tmdb_id, media_type=None):
    """
    Fetch TMDB metadata exact match by tmdb_id.
    Supports both movies and TV series/anime.
    """
    api_key = get_tmdb_api_key()
    if not api_key:
        return None

    if not media_type:
        local = Movie.objects.filter(tmdb_id=tmdb_id).first()
        if local:
            media_type = local.media_type

    endpoints = []
    if media_type in ['tv', 'anime']:
        endpoints = ['tv', 'movie']
    elif media_type == 'movie':
        endpoints = ['movie', 'tv']
    else:
        endpoints = ['movie', 'tv']

    for ep in endpoints:
        try:
            url = f"https://api.themoviedb.org/3/{ep}/{tmdb_id}?api_key={api_key}&language=zh-TW"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                data['media_type'] = ep
                
                genres = [g['name'] for g in data.get('genres', [])][:5]
                poster_path = data.get('poster_path')
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
                
                release_date = data.get('release_date') or data.get('first_air_date') or ''
                release_year = None
                if release_date:
                    try:
                        release_year = int(release_date.split('-')[0])
                    except:
                        pass
                
                classified_type = determine_media_type(data)
                
                return {
                    'tmdb_id': data.get('id'),
                    'title': data.get('title') or data.get('name'),
                    'localized_title': data.get('title') or data.get('name'),
                    'original_title': data.get('original_title') or data.get('original_name'),
                    'genres': genres,
                    'poster_url': poster_url,
                    'release_year': release_year,
                    'media_type': classified_type,
                }
        except Exception:
            continue
        
    return None

def find_disambiguation_candidates(query):
    """
    Check if a query has diverse media_types (e.g. anime vs tv vs movie)
    and return up to 3 diverse candidates for LINE Bot clarification.
    """
    results = search_tmdb_movies(query)
    if not results:
        return []
        
    seen_types = set()
    diverse_candidates = []
    
    for r in results:
        mtype = r.get('media_type', 'movie')
        if mtype not in seen_types:
            seen_types.add(mtype)
            diverse_candidates.append(r)
        if len(diverse_candidates) >= 3:
            break
            
    if len(seen_types) > 1:
        return diverse_candidates
        
    return []


def fetch_tmdb_popular_pool(pool_size=50):
    """
    Fetch and cache a pool of popular movies from TMDB.
    Uses Django Cache with key 'tmdb_speed_pool', TTL = 2 hours.
    Returns a list of dicts with 'tmdb_id', 'title' (zh-TW), 'original_title', 'poster_url'.
    """
    CACHE_KEY = 'tmdb_speed_pool'
    cached = cache.get(CACHE_KEY)
    if cached:
        return cached

    api_key = get_tmdb_api_key()
    if not api_key:
        return []

    try:
        # Fetch from 5 random pages to get a more diverse pool
        all_movies = []
        for _ in range(5):
            page = random.randint(1, 15)
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

        # Cache for 2 hours (7200 seconds)
        cache.set(CACHE_KEY, pool, timeout=7200)
        return pool

    except Exception as e:
        print(f"TMDB Popular Pool Fetch Error: {e}")
        return []


def fetch_watch_providers(tmdb_id, media_type='movie', region='TW'):
    """
    Fetch streaming/watch providers for a movie or TV show from TMDB.
    Uses the /watch/providers endpoint powered by JustWatch data.
    Results are cached for 24 hours.
    
    Returns a dict:
    {
        "link": "https://...",  # JustWatch page for this title in the region
        "flatrate": [{"provider_name": "Netflix", "logo_url": "https://..."}],
        "rent": [...],
        "buy": [...]
    }
    Or empty dict if no data available.
    """
    if not tmdb_id:
        return {}

    cache_key = f"watch_providers_{media_type}_{tmdb_id}_{region}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    api_key = get_tmdb_api_key()
    if not api_key:
        return {}

    try:
        tmdb_ep = 'tv' if media_type in ['tv', 'anime'] else 'movie'
        url = f"https://api.themoviedb.org/3/{tmdb_ep}/{tmdb_id}/watch/providers?api_key={api_key}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))

        region_data = data.get('results', {}).get(region, {})
        if not region_data:
            result = {}
            cache.set(cache_key, result, timeout=86400)
            return result

        def _format_providers(providers_list):
            return [
                {
                    'provider_name': p.get('provider_name', ''),
                    'logo_url': f"https://image.tmdb.org/t/p/original{p['logo_path']}" if p.get('logo_path') else None,
                    'provider_id': p.get('provider_id'),
                }
                for p in (providers_list or [])
            ]

        result = {
            'link': region_data.get('link', ''),
            'flatrate': _format_providers(region_data.get('flatrate')),
            'rent': _format_providers(region_data.get('rent')),
            'buy': _format_providers(region_data.get('buy')),
        }

        # Cache for 24 hours
        cache.set(cache_key, result, timeout=86400)
        return result

    except Exception as e:
        print(f"TMDB Watch Providers Fetch Error: {e}")
        return {}
