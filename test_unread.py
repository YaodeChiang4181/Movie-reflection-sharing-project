import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from rest_framework.test import APIClient
from api.models import User
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.filter(username="ghost").first()
if user:
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    
    print("Testing /api/notifications/unread_count/")
    res1 = client.get('/api/notifications/unread_count/')
    print("Unread count status:", res1.status_code)
    
    print("Testing /api/movies/speed_rating_candidates/")
    res2 = client.get('/api/movies/speed_rating_candidates/')
    print("Speed rating status:", res2.status_code)
    
    print("Testing /api/feed/?type=all")
    res3 = client.get('/api/feed/?type=all')
    print("Feed status:", res3.status_code)
