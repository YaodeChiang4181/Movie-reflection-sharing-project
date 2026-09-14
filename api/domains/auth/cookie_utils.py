from django.conf import settings

def set_jwt_cookies(response, access_token, refresh_token=None):
    """將 JWT Token 寫入 HttpOnly Cookie"""
    response.set_cookie(
        key=settings.JWT_COOKIE_NAME,
        value=str(access_token),
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        path='/',
    )
    if refresh_token:
        response.set_cookie(
            key=settings.JWT_REFRESH_COOKIE_NAME,
            value=str(refresh_token),
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            path='/api/auth/',  # 只在 /api/auth/ 底下發送
        )
    return response

def clear_jwt_cookies(response):
    """清除 JWT Cookie（登出用）"""
    response.delete_cookie(settings.JWT_COOKIE_NAME, path='/')
    response.delete_cookie(settings.JWT_REFRESH_COOKIE_NAME, path='/api/auth/')
    return response
