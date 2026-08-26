from django.urls import path, include
from django.http import HttpResponse
from api.domains.auth.views import UserMeView, PublicProfileView

def ping(request):
    return HttpResponse("pong")

def fix_tmdb(request):
    from api.models import Movie
    from api.utils.tmdb import fetch_movie_metadata
    movies = Movie.objects.all()
    updated_count = 0
    
    for movie in movies:
        meta = fetch_movie_metadata(movie.title)
        if meta:
            needs_update = False
            if movie.original_title != meta.get('original_title'):
                movie.original_title = meta.get('original_title')
                needs_update = True
            
            if movie.poster_url != meta.get('poster_url'):
                movie.poster_url = meta.get('poster_url')
                needs_update = True

            if needs_update:
                movie.save()
                updated_count += 1

    return HttpResponse(f"Fix complete! Updated {updated_count} movies.")

urlpatterns = [
    # Domain: Auth / Identity
    path('auth/', include('api.domains.auth.urls')),
    
    # 為了不破壞原本前端的 /api/users/me/ 呼叫
    path('users/me/', UserMeView.as_view(), name='user_me'),
    
    # 公開使用者名片資料
    path('users/<str:campus_id>/public_profile/', PublicProfileView.as_view(), name='user_public_profile'),
    
    # 用於 Google Apps Script 等定時喚醒後台的輕量級端點
    path('ping/', ping, name='ping'),
    
    # 臨時端點：用來修復資料庫電影抓取錯誤
    path('fix-tmdb/', fix_tmdb, name='fix_tmdb'),
    
    # Domain: Reviews (Movies, Reviews, Votes, Comments)
    path('', include('api.domains.reviews.urls')),
    
    # Domain: Events (揪團活動)
    path('', include('api.domains.events.urls')),
    
    # Domain: Campaigns & Core Admin (實體活動與廣告管理)
    path('', include('api.domains.campaigns.urls')),
    
    # Integrations: LINE Webhook
    path('line/', include('api.integrations.line.urls')),
]
