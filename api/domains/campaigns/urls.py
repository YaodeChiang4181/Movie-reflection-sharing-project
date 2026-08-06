from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AdvertisementViewSet

router = DefaultRouter()
router.register(r'admin/advertisements', AdvertisementViewSet, basename='admin-advertisement')

urlpatterns = [
] + router.urls
