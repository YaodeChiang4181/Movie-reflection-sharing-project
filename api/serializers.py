# pyrefly: ignore [missing-import]
from rest_framework import serializers
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile, Movie, Tag, Review, Vote, Event

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('nickname',)

class UserSerializer(serializers.ModelSerializer):
    nickname = serializers.CharField(source='profile.nickname', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'nickname', 'date_joined')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    email = serializers.EmailField(required=True)
    nickname = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'nickname')

    def validate_email(self, value):
        if not value.endswith('@g.ncu.edu.tw'):
            raise serializers.ValidationError("必須使用中央大學信箱 (@g.ncu.edu.tw) 進行註冊")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("此信箱已被註冊")
        return value

    def create(self, validated_data):
        nickname = validated_data.pop('nickname', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email']
        )
        UserProfile.objects.create(user=user, nickname=nickname)
        return user


from django.utils import timezone
from django.db import transaction

class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name')

class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    movie_id = serializers.PrimaryKeyRelatedField(
        queryset=Movie.objects.all(), source='movie', write_only=True
    )
    movie = MovieSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    # Accepts a list of tag names during creation
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50), write_only=True, required=False
    )
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'movie', 'movie_id', 'rating', 'content', 'is_spoiler', 'tags', 'tag_names', 'created_at')

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        
        with transaction.atomic():
            review = Review.objects.create(**validated_data)
            
            for name in tag_names:
                # Get or create the tag
                tag, created = Tag.objects.get_or_create(name=name)
                review.tags.add(tag)
                
        return review

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ('id', 'user', 'review', 'vote_type')
        read_only_fields = ('user',)

class EventSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Event
        fields = ('id', 'user', 'title', 'location', 'event_time', 'contact_info', 'created_at')
        
    def validate_event_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("放映時間不能是過去的時間。")
        return value
        
    def validate_location(self, value):
        if not value.strip():
            raise serializers.ValidationError("影城地點不能為空白。")
        return value
        
    def validate_contact_info(self, value):
        if not value.strip():
            raise serializers.ValidationError("聯絡渠道不能為空白。")
        return value
