from rest_framework import serializers
from api.models import DriftBottle

class DriftBottleSerializer(serializers.ModelSerializer):
    nickname = serializers.SerializerMethodField()

    class Meta:
        model = DriftBottle
        fields = ['id', 'movie_title', 'message', 'nickname', 'created_at']
        read_only_fields = ['id', 'nickname', 'created_at']

    def get_nickname(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.nickname:
            return obj.user.profile.nickname
        return obj.user.line_display_name or "匿名使用者"
