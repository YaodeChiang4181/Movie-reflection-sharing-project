from api.models import Notification
from django.db.models import F
# See how many notifications a user sent to themselves
print(Notification.objects.filter(title__contains="發布了新心得").count())
