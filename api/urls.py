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

def fix_events(request):
    from api.models import Event, EventRegistration
    events = Event.objects.all()
    count = 0
    for event in events:
        if not EventRegistration.objects.filter(event=event, user=event.user).exists():
            EventRegistration.objects.create(
                event=event,
                user=event.user,
                status='REGISTERED'
            )
            count += 1
    return HttpResponse(f"Fix complete! Auto-registered creators for {count} events.")

urlpatterns = [
    # Domain: Auth / Identity
    path('auth/', include('api.domains.auth.urls')),
    
    # 為了不破壞原本前端的 /api/users/me/ 呼叫
    path('users/me/', UserMeView.as_view(), name='user_me'),
    
    # 公開使用者名片資料
    path('users/<str:campus_id>/public_profile/', PublicProfileView.as_view(), name='user_public_profile'),
    
    # 用於 Google Apps Script 等定時喚醒後台的輕量級端點
    path('ping/', ping, name='ping'),
    
    # 臨時端點：用來修復資料庫電影抓取錯誤與活動報名紀錄
    path('fix-tmdb/', fix_tmdb, name='fix_tmdb'),
    path('fix-events/', fix_events, name='fix_events'),
    
    # Domain: Reviews (Movies, Reviews, Votes, Comments)
    path('', include('api.domains.reviews.urls')),
    
    # Domain: Events (揪團活動)
    path('', include('api.domains.events.urls')),
    
    # Domain: Campaigns & Core Admin (實體活動與廣告管理)
    path('', include('api.domains.campaigns.urls')),
    
    # Domain: Notifications & Mailbox
    path('', include('api.domains.notifications.urls')),
    
    # Integrations: LINE Webhook
    path('line/', include('api.integrations.line.urls')),
]
