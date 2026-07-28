# pyrefly: ignore [missing-import]
from rest_framework import serializers
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile, Movie, Tag, Review, Vote, Event, Comment, OutsiderIdentity, UserIdentity, Advertisement

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
    
    # 共同欄位
    nickname = serializers.CharField(max_length=50, write_only=True)
    is_outsider = serializers.BooleanField(write_only=True, default=False)
    
    # 校內學生欄位
    campus_id = serializers.CharField(required=False)
    real_name = serializers.CharField(max_length=50, write_only=True)
    department = serializers.CharField(max_length=100, write_only=True, required=False)
    school_email = serializers.EmailField(write_only=True, required=False)
    
    # 校外人士欄位
    email = serializers.EmailField(write_only=True, required=False)
    occupation = serializers.CharField(max_length=100, write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ('campus_id', 'password', 'real_name', 'department', 'school_email', 'nickname', 'is_outsider', 'email', 'occupation')
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, attrs):
        is_outsider = attrs.get('is_outsider', False)
        if is_outsider:
            if not attrs.get('real_name'):
                raise serializers.ValidationError({"real_name": "校外人士必須填寫姓名"})
            if not attrs.get('email'):
                raise serializers.ValidationError({"email": "校外人士必須填寫信箱"})
            if OutsiderIdentity.objects.filter(email=attrs.get('email')).exists():
                raise serializers.ValidationError({"email": "此信箱已被註冊"})
        else:
            if not attrs.get('campus_id'):
                raise serializers.ValidationError({"campus_id": "校內學生必須填寫學號"})
            import re
            if not re.match(r'^\d{9}$', attrs.get('campus_id', '')):
                raise serializers.ValidationError({"campus_id": "學號必須剛好是 9 位數字"})
            if User.objects.filter(campus_id=attrs.get('campus_id')).exists():
                raise serializers.ValidationError({"campus_id": "此學號已被註冊"})
            
            school_email = attrs.get('school_email', '')
            if not school_email.endswith('@cc.ncu.edu.tw'):
                raise serializers.ValidationError({"school_email": "必須使用中央大學信箱 (@cc.ncu.edu.tw)"})
                
        # 檢查暱稱是否重複
        if UserProfile.objects.filter(nickname=attrs.get('nickname')).exists():
            raise serializers.ValidationError({"nickname": "此代碼/暱稱已被使用"})
        return attrs

    def create(self, validated_data):
        is_outsider = validated_data.pop('is_outsider', False)
        real_name = validated_data.pop('real_name')
        nickname = validated_data.pop('nickname')
        password = validated_data.pop('password')
        
        with transaction.atomic():
            if is_outsider:
                # 產生 26 進位的 9 碼字串
                count = OutsiderIdentity.objects.count()
                if count == 0:
                    base26_str = 'a'
                else:
                    base26_str = ''
                    n = count
                    while n > 0:
                        base26_str = chr((n % 26) + 97) + base26_str
                        n //= 26
                campus_id = base26_str.rjust(9, 'a')
                
                user = User(campus_id=campus_id, username=campus_id)
                user.set_password(password)
                user.save()
                
                email = validated_data.pop('email')
                occupation = validated_data.pop('occupation', '')
                OutsiderIdentity.objects.create(user=user, real_name=real_name, email=email, occupation=occupation)
            else:
                campus_id = validated_data.pop('campus_id')
                department = validated_data.pop('department', '')
                school_email = validated_data.pop('school_email')
                
                user = User(campus_id=campus_id, username=campus_id)
                user.set_password(password)
                user.save()
                
                # 建立機密身分表
                UserIdentity.objects.create(user=user, real_name=real_name, department=department, school_email=school_email)
            
            # 建立公開主頁表
            UserProfile.objects.create(user=user, nickname=nickname)
            
        return user


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # 攔截並判斷是否為信箱登入
        username = attrs.get(self.username_field)
        if username and '@' in username:
            try:
                outsider = OutsiderIdentity.objects.get(email=username)
                attrs[self.username_field] = outsider.user.campus_id
            except OutsiderIdentity.DoesNotExist:
                pass
                
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

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ('id', 'review', 'user', 'content', 'created_at')
        read_only_fields = ('review',)

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
    user_voted = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'movie', 'movie_title', 'rating', 'content', 'is_spoiler', 'tags', 'tag_names', 'created_at', 'score', 'user_voted', 'comments_count')

    def get_user_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Vote.objects.filter(review=obj, user=request.user).exists()
        return False

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
        fields = ('id', 'user', 'title', 'location', 'event_time', 'organizer_nickname', 'description', 'created_at')
        
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

class AdvertisementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Advertisement
        fields = '__all__'

