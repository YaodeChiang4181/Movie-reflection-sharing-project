from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, CustomTokenObtainPairView, UserMeView, AdminUserViewSet, 
    SendVerificationView, VerifyEmailView, LineLoginView, MergeGhostAccountView
)

router = DefaultRouter()
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('line-login/', LineLoginView.as_view(), name='line_login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('send-verification/', SendVerificationView.as_view(), name='send_verification'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('admin/merge-ghost/', MergeGhostAccountView.as_view(), name='admin_merge_ghost'),
] + router.urls
