from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DriftBottleViewSet

router = DefaultRouter()
router.register(r'', DriftBottleViewSet, basename='drift-bottle')

urlpatterns = [
    path('', include(router.urls)),
]
