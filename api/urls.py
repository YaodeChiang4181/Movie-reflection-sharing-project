from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.routers import DefaultRouter
from .views import RegisterView, MovieViewSet, ReviewViewSet, EventViewSet

router = DefaultRouter()
router.register(r'movies', MovieViewSet, basename='movie')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
] + router.urls
