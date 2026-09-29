from api.models import Follow
from django.db.models import F
deleted_count, _ = Follow.objects.filter(follower=F('following')).delete()
print(f"Deleted {deleted_count} self-follows.")
