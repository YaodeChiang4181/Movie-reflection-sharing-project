from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MovieViewSet, ReviewViewSet

router = DefaultRouter()
router.register(r'movies', MovieViewSet, basename='movie')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    # Review endpoints are mounted at /api/reviews/ (from root urls)
] + router.urls
