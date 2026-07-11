from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from rest_framework.routers import DefaultRouter
from .views import RegisterView, MovieViewSet, ReviewViewSet, EventViewSet, CustomTokenObtainPairView, UserMeView, AdminUserViewSet

router = DefaultRouter()
router.register(r'movies', MovieViewSet, basename='movie')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'events', EventViewSet, basename='event')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/me/', UserMeView.as_view(), name='user_me'),
] + router.urls
