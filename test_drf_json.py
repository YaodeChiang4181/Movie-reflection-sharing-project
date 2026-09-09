import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from rest_framework.renderers import JSONRenderer
print(len(JSONRenderer().render({"error": "Failed to get user info from NCU"})))
print(len(JSONRenderer().render({"error": "Could not get access_token from NCU"})))
print(len(JSONRenderer().render({"error": "NCU profile missing identifier"})))
