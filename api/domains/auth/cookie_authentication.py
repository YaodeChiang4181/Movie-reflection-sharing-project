from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    """從 HttpOnly Cookie 讀取 JWT Token（優先於 Authorization header）"""
    
    def authenticate(self, request):
        # 1. 先嘗試從 Cookie 讀取
        raw_token = request.COOKIES.get(settings.JWT_COOKIE_NAME)
        if raw_token:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        
        # 2. 若 Cookie 無 Token，fallback 到傳統 Authorization header
        #    （相容過渡期與 LINE Bot 等 server-to-server 場景）
        return super().authenticate(request)
