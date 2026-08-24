from rest_framework import serializers
from django.utils import timezone
from api.models import Event
from api.domains.auth.serializers import UserSerializer

class EventSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Event
        fields = ('id', 'user', 'title', 'location', 'event_time', 'organizer_nickname', 'description', 'created_at')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('user'):
            data['user'] = {'campus_id': 'ghost', 'nickname': '已註銷的使用者'}
        return data
        
    def validate_event_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("放映時間不能是過去的時間。")
        return value
        
    def validate_location(self, value):
        if not value.strip():
            raise serializers.ValidationError("地點不能為空白。")
        return value
        
    def validate_organizer_nickname(self, value):
        if not value.strip():
            raise serializers.ValidationError("主辦人代稱不能為空白。")
        return value
