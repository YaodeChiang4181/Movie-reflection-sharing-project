import os
import django
from django.test import RequestFactory
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.integrations.line.webhook import handle_message
from linebot.models import MessageEvent, TextMessage, SourceUser

event = MessageEvent(
    type='message',
    message=TextMessage(id='12345678901234', text='寫心得'),
    timestamp=1625665242211,
    source=SourceUser(user_id='U1234567890abcdef1234567890abcdef'),
    reply_token='11111111111111111111111111111111',
    mode='active'
)

print("Calling handle_message...")
try:
    handle_message(event)
    print("Done without error!")
except Exception as e:
    print("Error:", e)
