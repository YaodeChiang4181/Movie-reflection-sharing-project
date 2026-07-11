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
        fields = ('campus_id', 'nickname', 'date_joined')

class UserMeSerializer(serializers.ModelSerializer):
    nickname = serializers.CharField(source='profile.nickname', read_only=True)
    real_name = serializers.CharField(source='identity.real_name', read_only=True)
    department = serializers.CharField(source='identity.department', read_only=True)

    class Meta:
        model = User
        fields = ('campus_id', 'nickname', 'real_name', 'department', 'date_joined')

from .models import UserIdentity

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    real_name = serializers.CharField(max_length=50, write_only=True)
    department = serializers.CharField(max_length=100, write_only=True)
    school_email = serializers.EmailField(write_only=True)
    nickname = serializers.CharField(max_length=50, write_only=True)
    
    class Meta:
        model = User
        fields = ('campus_id', 'password', 'real_name', 'department', 'school_email', 'nickname')
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_campus_id(self, value):
        import re
        if not re.match(r'^\d{9}$', value):
            raise serializers.ValidationError("學號必須剛好是 9 位數字")
        if User.objects.filter(campus_id=value).exists():
            raise serializers.ValidationError("此校園ID已被註冊")
        return value

    def validate_school_email(self, value):
        if not value.endswith('@cc.ncu.edu.tw'):
            raise serializers.ValidationError("必須使用中央大學信箱 (@cc.ncu.edu.tw)")
        return value

    def validate(self, attrs):
        # 檢查暱稱是否重複
        if UserProfile.objects.filter(nickname=attrs['nickname']).exists():
            raise serializers.ValidationError({"nickname": "此代碼/暱稱已被使用"})
        return attrs

    def create(self, validated_data):
        real_name = validated_data.pop('real_name')
        department = validated_data.pop('department')
        school_email = validated_data.pop('school_email')
        nickname = validated_data.pop('nickname')
        
        with transaction.atomic():
            user = User(
                campus_id=validated_data['campus_id'],
                username=validated_data['campus_id'] # 保留 username 欄位的值以防其他 Django 內部機制需要
            )
            user.set_password(validated_data['password'])
            user.save()
            
            # 建立機密身分表
            UserIdentity.objects.create(user=user, real_name=real_name, department=department, school_email=school_email)
            # 建立公開主頁表
            UserProfile.objects.create(user=user, nickname=nickname)
            
        return user


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add custom data to the response
        data['user'] = {
            'campus_id': self.user.campus_id,
            'nickname': getattr(self.user, 'profile', None) and self.user.profile.nickname,
            'is_staff': self.user.is_staff
        }
        return data


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
    movie_title = serializers.CharField(write_only=True)
    movie = MovieSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    # Accepts a list of tag names during creation
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50), write_only=True, required=False
    )
    score = serializers.IntegerField(read_only=True, required=False)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'movie', 'movie_title', 'rating', 'content', 'is_spoiler', 'tags', 'tag_names', 'created_at', 'score')

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        movie_title = validated_data.pop('movie_title')
        
        with transaction.atomic():
            # Automatically get or create the movie by title
            movie, _ = Movie.objects.get_or_create(
                title=movie_title,
                defaults={'director': 'Unknown', 'release_year': timezone.now().year}
            )
            validated_data['movie'] = movie
            
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
