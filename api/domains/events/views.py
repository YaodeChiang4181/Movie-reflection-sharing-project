from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from api.models import Event
from .serializers import EventSerializer

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('event_time')
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
