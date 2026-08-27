from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from api.models import Notification, DirectMessage, Follow
from .serializers import NotificationSerializer, DirectMessageSerializer, FollowSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
        
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'ok'})
        
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

class DirectMessageViewSet(viewsets.ModelViewSet):
    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = DirectMessage.objects.filter(
            models.Q(sender=self.request.user) | models.Q(receiver=self.request.user)
        ).order_by('-created_at')
        
        partner_id = self.request.query_params.get('partner_id')
        if partner_id:
            qs = qs.filter(
                models.Q(sender__campus_id=partner_id) | models.Q(receiver__campus_id=partner_id)
            )
        return qs
        
    def perform_create(self, serializer):
        from api.models import User
        receiver_id = serializer.validated_data.pop('receiver_id')
        receiver = User.objects.get(campus_id=receiver_id)
        serializer.save(sender=self.request.user, receiver=receiver)

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        user = request.user
        messages = DirectMessage.objects.filter(
            models.Q(sender=user) | models.Q(receiver=user)
        ).order_by('-created_at')
        
        conversations = {}
        for msg in messages:
            partner = msg.sender if msg.sender.id != user.id else msg.receiver
            if partner.campus_id not in conversations:
                from api.domains.auth.serializers import UserSerializer
                conversations[partner.campus_id] = {
                    'partner': UserSerializer(partner).data,
                    'last_message': DirectMessageSerializer(msg).data,
                    'unread_count': 0
                }
            if msg.receiver == user and not msg.is_read:
                conversations[partner.campus_id]['unread_count'] += 1
                
        return Response(list(conversations.values()))
        
    @action(detail=False, methods=['patch'], url_path='mark-read')
    def mark_read(self, request):
        partner_id = request.data.get('partner_id')
        if not partner_id:
            return Response({'detail': 'partner_id is required'}, status=400)
            
        DirectMessage.objects.filter(
            sender__campus_id=partner_id,
            receiver=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({'status': 'ok'})

class FollowViewSet(viewsets.ModelViewSet):
    serializer_class = FollowSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Follow.objects.filter(follower=self.request.user)
        
    def perform_create(self, serializer):
        from api.models import User
        following_id = self.request.data.get('following_id')
        if following_id:
            following = User.objects.get(campus_id=following_id)
            serializer.save(follower=self.request.user, following=following)
            
    @action(detail=False, methods=['delete'])
    def unfollow(self, request):
        following_id = request.data.get('following_id')
        if following_id:
            Follow.objects.filter(follower=request.user, following__campus_id=following_id).delete()
            return Response({'status': 'unfollowed'})
        return Response({'error': 'missing following_id'}, status=400)
