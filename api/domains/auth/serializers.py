from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.crypto import get_random_string
from django.db import transaction
from api.models import UserProfile, OutsiderIdentity, UserIdentity, EmailVerification
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('nickname',)

class UserSerializer(serializers.ModelSerializer):
    nickname = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('campus_id', 'nickname', 'date_joined')

    def get_nickname(self, obj):
        if hasattr(obj, 'profile') and obj.profile:
            return obj.profile.nickname
        return obj.username or obj.campus_id or "Unknown"

class UserMeSerializer(serializers.ModelSerializer):
    nickname = serializers.SerializerMethodField()
    real_name = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('campus_id', 'nickname', 'real_name', 'department', 'date_joined')

    def get_nickname(self, obj):
        if hasattr(obj, 'profile') and obj.profile:
            return obj.profile.nickname
        return obj.username or obj.campus_id or "Unknown"

    def get_real_name(self, obj):
        if hasattr(obj, 'identity') and obj.identity:
            return obj.identity.real_name
        if hasattr(obj, 'outsider_identity') and obj.outsider_identity:
            return obj.outsider_identity.real_name
        return None

    def get_department(self, obj):
        if hasattr(obj, 'identity') and obj.identity:
            return obj.identity.department
        return None

class AdminUserSerializer(serializers.ModelSerializer):
    """管理後台專用：顯示真實姓名、信箱（兼容校內/校外使用者）"""
    nickname = serializers.SerializerMethodField()
    real_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    user_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('campus_id', 'nickname', 'real_name', 'email', 'user_type', 'date_joined')

    def get_nickname(self, obj):
        if hasattr(obj, 'profile') and obj.profile:
            return obj.profile.nickname
        return obj.username or obj.campus_id or "Unknown"

    def get_real_name(self, obj):
        if hasattr(obj, 'identity') and obj.identity:
            return obj.identity.real_name
        if hasattr(obj, 'outsider_identity') and obj.outsider_identity:
            return obj.outsider_identity.real_name
        if obj.line_display_name:
            return f"{obj.line_display_name} (LINE)"
        return None

    def get_email(self, obj):
        if hasattr(obj, 'identity') and obj.identity:
            return obj.identity.school_email
        if hasattr(obj, 'outsider_identity') and obj.outsider_identity:
            return obj.outsider_identity.email
        return None

    def get_user_type(self, obj):
        if hasattr(obj, 'identity') and obj.identity:
            return '校內'
        if hasattr(obj, 'outsider_identity') and obj.outsider_identity:
            return '校外'
        if obj.line_user_id:
            return 'LINE註冊'
        return '未知'

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    nickname = serializers.CharField(max_length=50, write_only=True)
    is_outsider = serializers.BooleanField(write_only=True, default=False)
    
    campus_id = serializers.CharField(required=False)
    real_name = serializers.CharField(max_length=50, write_only=True)
    department = serializers.CharField(max_length=100, write_only=True, required=False)
    school_email = serializers.EmailField(write_only=True, required=False)
    
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
            email = attrs.get('email')
            if not email:
                raise serializers.ValidationError({"email": "校外人士必須填寫信箱"})
            if OutsiderIdentity.objects.filter(email=email).exists():
                raise serializers.ValidationError({"email": "此信箱已被註冊"})
            if not EmailVerification.objects.filter(email=email, is_verified=True).exists():
                raise serializers.ValidationError({"email": "請先完成信箱驗證"})
        else:
            if not attrs.get('campus_id'):
                raise serializers.ValidationError({"campus_id": "校內學生必須填寫學號"})
            import re
            if not re.match(r'^\d{9}$', attrs.get('campus_id', '')):
                raise serializers.ValidationError({"campus_id": "學號必須剛好是 9 位數字"})
            if User.objects.filter(campus_id=attrs.get('campus_id')).exists():
                raise serializers.ValidationError({"campus_id": "此學號已被註冊"})
            
            school_email = attrs.get('school_email', '')
            if not school_email:
                raise serializers.ValidationError({"school_email": "必須填寫學校信箱"})
            if not school_email.endswith('@cc.ncu.edu.tw'):
                raise serializers.ValidationError({"school_email": "必須使用中央大學信箱 (@cc.ncu.edu.tw)"})
            if not EmailVerification.objects.filter(email=school_email, is_verified=True).exists():
                raise serializers.ValidationError({"school_email": "請先完成信箱驗證"})
                
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
                while True:
                    campus_id = get_random_string(9, allowed_chars='abcdefghijklmnopqrstuvwxyz')
                    if not User.objects.filter(campus_id=campus_id).exists():
                        break
                
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
                
                UserIdentity.objects.create(user=user, real_name=real_name, department=department, school_email=school_email)
            
            UserProfile.objects.create(user=user, nickname=nickname)
            
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field)
        if username and '@' in username:
            try:
                outsider = OutsiderIdentity.objects.get(email=username)
                attrs[self.username_field] = outsider.user.campus_id
            except OutsiderIdentity.DoesNotExist:
                pass
                
        data = super().validate(attrs)
        data['user'] = {
            'campus_id': self.user.campus_id,
            'nickname': self.user.profile.nickname if hasattr(self.user, 'profile') and self.user.profile else self.user.username,
            'is_staff': self.user.is_staff
        }
        return data
