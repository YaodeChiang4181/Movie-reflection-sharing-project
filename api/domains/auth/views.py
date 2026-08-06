from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
import random
import os
import requests
from django.core.mail import send_mail
from api.models import EmailVerification
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer, UserMeSerializer, AdminUserSerializer

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserMeView(generics.RetrieveAPIView):
    serializer_class = UserMeSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

class AdminUserViewSet(viewsets.ModelViewSet):
    """管理員專用的使用者管理介面"""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.filter(is_staff=False).select_related(
            'profile', 'identity', 'outsider_identity'
        ).order_by('-date_joined')

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_staff:
            return Response({"error": "Cannot delete admin user"}, status=status.HTTP_403_FORBIDDEN)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class SendVerificationView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': '請提供信箱'}, status=status.HTTP_400_BAD_REQUEST)

        one_min_ago = timezone.now() - timedelta(minutes=1)
        recent = EmailVerification.objects.filter(email=email, created_at__gte=one_min_ago).first()
        if recent:
            return Response({'error': '發送過於頻繁，請稍後再試'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        code = f"{random.randint(0, 999999):06d}"
        
        try:
            subject = '【影像製作所】註冊驗證碼'
            message = f'歡迎註冊影像製作所平台！\n\n您的驗證碼是：{code}\n\n此驗證碼將在 10 分鐘後失效，請勿將驗證碼外洩給他人。'
            
            gas_url = os.environ.get('GAS_EMAIL_URL')
            
            if gas_url:
                response = requests.post(gas_url, json={
                    'email': email,
                    'subject': subject,
                    'body': message
                })
                if response.status_code != 200:
                    raise Exception('GAS 回傳錯誤')
            else:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=None,
                    recipient_list=[email],
                    fail_silently=False,
                )
            
            EmailVerification.objects.filter(email=email, is_verified=False).delete()
            EmailVerification.objects.create(email=email, code=code)
            
            return Response({'message': '驗證碼已發送'})
        except Exception as e:
            return Response({'error': f'寄信失敗，請確認伺服器設定'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyEmailView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'error': '請提供信箱與驗證碼'}, status=status.HTTP_400_BAD_REQUEST)

        ten_mins_ago = timezone.now() - timedelta(minutes=10)
        record = EmailVerification.objects.filter(
            email=email, 
            code=code, 
            created_at__gte=ten_mins_ago,
            is_verified=False
        ).first()

        if not record:
            return Response({'error': '驗證碼錯誤或已過期'}, status=status.HTTP_400_BAD_REQUEST)

        record.is_verified = True
        record.save()

        return Response({'message': '信箱驗證成功'})

class LineLoginView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'Missing access_token'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Verify token with LINE
        headers = {'Authorization': f'Bearer {access_token}'}
        resp = requests.get('https://api.line.me/v2/profile', headers=headers)
        if resp.status_code != 200:
            return Response({'error': 'Invalid LINE token'}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile_data = resp.json()
        line_user_id = profile_data.get('userId')
        display_name = profile_data.get('displayName', 'LINE User')
        
        if not line_user_id:
            return Response({'error': 'Could not get LINE User ID'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.filter(line_user_id=line_user_id).first()
        
        if not user:
            # Create a light account if not found
            import string
            
            def generate_random_campus_id():
                while True:
                    cid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
                    if not User.objects.filter(campus_id=cid).exists():
                        return cid
                        
            campus_id = generate_random_campus_id()
            user = User.objects.create(
                campus_id=campus_id,
                line_user_id=line_user_id,
                line_display_name=display_name,
                username=display_name
            )
            random_nickname = f"User_{''.join(random.choices(string.ascii_letters + string.digits, k=6))}"
            from api.models import UserProfile
            UserProfile.objects.create(user=user, nickname=random_nickname)
            
        # Generate JWT for the user
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserMeSerializer(user).data
        })

