from ipware import get_client_ip

class RealIpMiddleware:
    """
    獲取真實的使用者 IP (支援 Cloudflare, Render 等 Proxy)
    並覆寫 request.META['REMOTE_ADDR']
    供後方 django-axes 及 DRF Throttle 準確判斷
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        client_ip, is_routable = get_client_ip(request)
        if client_ip:
            request.META['REMOTE_ADDR'] = client_ip
        return self.get_response(request)
