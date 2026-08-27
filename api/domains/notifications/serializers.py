from rest_framework import serializers
from api.models import Notification, DirectMessage, Follow
from api.domains.auth.serializers import UserSerializer

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'type', 'title', 'target_url', 'is_read', 'created_at')

class DirectMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    receiver_id = serializers.CharField(write_only=True)
    
    class Meta:
        model = DirectMessage
        fields = ('id', 'sender', 'receiver', 'receiver_id', 'content', 'is_read', 'created_at')

class FollowSerializer(serializers.ModelSerializer):
    follower = UserSerializer(read_only=True)
    following = UserSerializer(read_only=True)
    following_id = serializers.CharField(write_only=True)
    
    class Meta:
        model = Follow
        fields = ('id', 'follower', 'following', 'following_id', 'created_at')
