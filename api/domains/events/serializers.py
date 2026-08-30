from rest_framework import serializers
from django.utils import timezone
from api.models import Event, EventRegistration, EventComment
from api.domains.auth.serializers import UserSerializer
from api.domains.reviews.serializers import MovieSerializer

class EventRegistrationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = EventRegistration
        fields = ('id', 'user', 'status', 'created_at')

class EventCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = EventComment
        fields = ('id', 'user', 'content', 'user_tag', 'created_at')

class EventSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    movie = MovieSerializer(read_only=True)
    movie_id = serializers.IntegerField(write_only=True, required=False)
    status = serializers.SerializerMethodField()
    registered_count = serializers.IntegerField(read_only=True, required=False)
    comment_count = serializers.IntegerField(read_only=True, required=False)
    has_registered = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = (
            'id', 'user', 'title', 'location', 'event_time', 'start_time', 'end_time', 
            'capacity', 'cover_image', 'movie', 'movie_id', 'recap_text', 'recap_images', 'recap_url',
            'organizer_nickname', 'description', 'join_code', 'created_at', 'status', 
            'registered_count', 'comment_count', 'has_registered'
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('user'):
            data['user'] = {'campus_id': 'ghost', 'nickname': '已註銷的使用者'}
        return data

    def get_status(self, obj):
        if obj.end_time and timezone.now() > obj.end_time:
            return 'COMPLETED'
        return 'UPCOMING'
        
    def get_has_registered(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.registrations.filter(user=request.user, status='REGISTERED').exists()
        return False

    def validate(self, data):
        # Backwards compatibility or future-proofing validation
        if 'start_time' in data and data['start_time'] < timezone.now():
            raise serializers.ValidationError({"start_time": "開始時間不能是過去的時間。"})
        if 'start_time' in data and 'end_time' in data and data['end_time'] <= data['start_time']:
            raise serializers.ValidationError({"end_time": "結束時間必須晚於開始時間。"})
        if 'event_time' in data and data['event_time'] < timezone.now():
            raise serializers.ValidationError({"event_time": "放映時間不能是過去的時間。"})
            
        # UI/UX validations
        if not self.instance and not data.get('cover_image'):
            raise serializers.ValidationError({"cover_image": "必須上傳活動封面圖。"})
            
        desc = data.get('description', '') if not self.instance else data.get('description', self.instance.description)
        if not desc or len(desc.strip()) < 15:
            raise serializers.ValidationError({"description": "活動簡介至少需要 15 個字。"})
            
        capacity = data.get('capacity', 0) if not self.instance else data.get('capacity', self.instance.capacity)
        if capacity < 2 or capacity > 50:
            raise serializers.ValidationError({"capacity": "活動人數限制必須在 2 到 50 人之間。"})
            
        # Max 3 upcoming events per user
        if not self.instance:
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                upcoming_count = Event.objects.filter(
                    user=request.user,
                    end_time__gte=timezone.now()
                ).count()
                if upcoming_count >= 3:
                    raise serializers.ValidationError("您目前已經有 3 場即將舉辦的活動，無法再發起新活動。")
                    
        return data

    def validate_location(self, value):
        if not value.strip():
            raise serializers.ValidationError("地點不能為空白。")
        return value
        
    def validate_organizer_nickname(self, value):
        if not value.strip():
            raise serializers.ValidationError("主辦人代稱不能為空白。")
        return value
