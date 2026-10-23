from django.urls import path, re_path
from .webhook import line_webhook

urlpatterns = [
    re_path(r'^webhook/?$', line_webhook, name='line_webhook'),
]
