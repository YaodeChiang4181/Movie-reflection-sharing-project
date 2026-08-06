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
