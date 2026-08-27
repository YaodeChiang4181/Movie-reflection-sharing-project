import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Event, EventRegistration

def run():
    events = Event.objects.all()
    count = 0
    for event in events:
        reg, created = EventRegistration.objects.get_or_create(
            event=event,
            user=event.user,
            defaults={'status': 'REGISTERED'}
        )
        if created:
            count += 1
    
    print(f"Fixed {count} events: added author registration.")

if __name__ == '__main__':
    run()
