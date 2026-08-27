from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, CustomTokenObtainPairView, UserMeView, AdminUserViewSet, 
    SendVerificationView, VerifyEmailView, LineLoginView, GoogleLoginView, MergeGhostAccountView,
    RecalculateExpView, AdminStatsView, SyncUserExpView, UserAvatarUploadView,
    AdminInviteTokenView, ClaimBadgeView
)

router = DefaultRouter()
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('line-login/', LineLoginView.as_view(), name='line_login'),
    path('google-login/', GoogleLoginView.as_view(), name='google_login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('send-verification/', SendVerificationView.as_view(), name='send_verification'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('sync-exp/', SyncUserExpView.as_view(), name='sync_exp'),
    path('avatar/', UserAvatarUploadView.as_view(), name='user_avatar_upload'),
    path('admin/merge-ghost/', MergeGhostAccountView.as_view(), name='admin_merge_ghost'),
    path('admin/recalculate-exp/', RecalculateExpView.as_view(), name='admin_recalculate_exp'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('admin/invite-tokens/', AdminInviteTokenView.as_view(), name='admin_invite_token'),
    path('claim-badge/', ClaimBadgeView.as_view(), name='claim_badge'),
] + router.urls
