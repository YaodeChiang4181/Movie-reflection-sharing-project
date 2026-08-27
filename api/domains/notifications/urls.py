from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, DirectMessageViewSet, FollowViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'messages', DirectMessageViewSet, basename='directmessage')
router.register(r'follows', FollowViewSet, basename='follow')

urlpatterns = [
    path('', include(router.urls)),
]
