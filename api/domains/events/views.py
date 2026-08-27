from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from api.models import Event, EventRegistration, EventComment
from .serializers import EventSerializer, EventRegistrationSerializer, EventCommentSerializer

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    
    def get_queryset(self):
        queryset = Event.objects.all()
        status_param = self.request.query_params.get('status', None)
        
        now = timezone.now()
        if status_param == 'UPCOMING':
            queryset = queryset.filter(Q(end_time__gte=now) | Q(end_time__isnull=True))
            queryset = queryset.order_by('end_time', 'event_time')
        elif status_param == 'COMPLETED':
            queryset = queryset.filter(end_time__lt=now)
            queryset = queryset.order_by('-end_time', '-event_time')
        else:
            queryset = queryset.order_by('-created_at')

        return queryset.annotate(
            registered_count=Count('registrations', filter=Q(registrations__status='REGISTERED'), distinct=True),
            comment_count=Count('event_comments', distinct=True)
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            event = serializer.save(user=self.request.user)
            EventRegistration.objects.create(event=event, user=self.request.user, status='REGISTERED')

    def destroy(self, request, *args, **kwargs):
        event = self.get_object()
        if event.user != request.user and not request.user.is_staff:
            return Response({"detail": "您沒有權限刪除此活動。"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def register(self, request, pk=None):
        user = request.user
        
        with transaction.atomic():
            # Use select_for_update to lock the row and prevent race conditions for capacity
            try:
                event = Event.objects.select_for_update().get(pk=pk)
            except Event.DoesNotExist:
                return Response({'detail': '活動不存在'}, status=status.HTTP_404_NOT_FOUND)

            if event.end_time and timezone.now() > event.end_time:
                return Response({'detail': '活動已結束'}, status=status.HTTP_400_BAD_REQUEST)

            reg, created = EventRegistration.objects.get_or_create(
                event=event, user=user,
                defaults={'status': 'REGISTERED'}
            )
            
            if not created and reg.status == 'REGISTERED':
                return Response({'detail': '您已經報名過了'}, status=status.HTTP_400_BAD_REQUEST)
                
            current_registrations = event.registrations.filter(status='REGISTERED').count()
            if event.capacity > 0 and current_registrations >= event.capacity:
                return Response({'detail': '名額已滿'}, status=status.HTTP_400_BAD_REQUEST)

            if not created and reg.status == 'CANCELLED':
                reg.status = 'REGISTERED'

            reg.save()
            
        return Response({'detail': '報名成功'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def comments(self, request, pk=None):
        event = self.get_object()
        user = request.user
        content = request.data.get('content', '').strip()
        
        if not content:
            return Response({'detail': '留言內容不能為空'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine user_tag dynamically
        user_tag = '敲碗下次'
        if user == event.user:
            user_tag = '主辦方'
        elif event.registrations.filter(user=user, status='REGISTERED').exists():
            user_tag = '現場觀眾'

        comment = EventComment.objects.create(
            event=event, user=user, content=content, user_tag=user_tag
        )
        
        serializer = EventCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticatedOrReadOnly])
    def list_comments(self, request, pk=None):
        event = self.get_object()
        comments = event.event_comments.all().order_by('-created_at')
        serializer = EventCommentSerializer(comments, many=True)
        return Response(serializer.data)
