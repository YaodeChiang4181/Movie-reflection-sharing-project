from django.urls import path, include
from api.domains.auth.views import UserMeView

urlpatterns = [
    # Domain: Auth / Identity
    path('auth/', include('api.domains.auth.urls')),
    
    # 為了不破壞原本前端的 /api/users/me/ 呼叫
    path('users/me/', UserMeView.as_view(), name='user_me'),
    
    # Domain: Reviews (Movies, Reviews, Votes, Comments)
    path('', include('api.domains.reviews.urls')),
    
    # Domain: Events (揪團活動)
    path('', include('api.domains.events.urls')),
    
    # Domain: Campaigns & Core Admin (實體活動與廣告管理)
    path('', include('api.domains.campaigns.urls')),
    
    # Integrations: LINE Webhook
    path('line/', include('api.integrations.line.urls')),
]
