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
        user = self.request.user
        # 自動恢復特定使用者的管理員權限
        if user.campus_id == "113409016" and not user.is_staff:
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=['is_staff', 'is_superuser'])
        return user

class AdminUserViewSet(viewsets.ModelViewSet):
    """管理員專用的使用者管理介面"""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

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

class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'Missing access_token'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Verify token with Google
        headers = {'Authorization': f'Bearer {access_token}'}
        resp = requests.get('https://www.googleapis.com/oauth2/v3/userinfo', headers=headers)
        if resp.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile_data = resp.json()
        google_user_id = profile_data.get('sub')
        email = profile_data.get('email')
        display_name = profile_data.get('name', 'Google User')
        
        if not google_user_id or not email:
            return Response({'error': 'Could not get Google User ID or Email'}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. 檢查是否已經有這個 google_user_id 的帳號
        user = User.objects.filter(google_user_id=google_user_id).first()
        
        if not user:
            # 2. 如果沒有 google_user_id，檢查是否已經有這個 Email 的既有帳號
            from api.models import UserIdentity, OutsiderIdentity
            
            student_identity = UserIdentity.objects.filter(school_email=email).first()
            outsider_identity = OutsiderIdentity.objects.filter(email=email).first()
            
            if student_identity:
                user = student_identity.user
                user.google_user_id = google_user_id
                user.save(update_fields=['google_user_id'])
            elif outsider_identity:
                user = outsider_identity.user
                user.google_user_id = google_user_id
                user.save(update_fields=['google_user_id'])
            else:
                # 3. 兩者都沒有，創建新的 Google 輕量帳號
                import string
                
                def generate_random_campus_id():
                    while True:
                        cid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
                        if not User.objects.filter(campus_id=cid).exists():
                            return cid
                            
                campus_id = generate_random_campus_id()
                user = User.objects.create(
                    campus_id=campus_id,
                    google_user_id=google_user_id,
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

class SyncUserExpView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            from api.models import Review, Comment, Vote, UserExperience
            from api.domains.gamification.services import add_user_experience
            from django.db import transaction
            
            user = request.user
            with transaction.atomic():
                # Delete current exp
                UserExperience.objects.filter(user=user).delete()
                
                total_exp = 0
                
                reviews_count = Review.objects.filter(user=user, is_deleted=False).count()
                total_exp += (reviews_count * 25)
                
                comments_count = Comment.objects.filter(user=user).count()
                total_exp += (comments_count * 10)
                
                likes_received = Vote.objects.filter(review__user=user, vote_type=1).count()
                total_exp += (likes_received * 1)
                
                if total_exp > 0:
                    add_user_experience(user, total_exp)
                    
            return Response({"message": "同步成功！您的歷史經驗值已更新。"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MergeGhostAccountView(APIView):
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        ghost_id = request.data.get('ghost_id')
        target_id = request.data.get('target_id')
        
        if not ghost_id or not target_id:
            return Response({'error': 'Missing ghost_id or target_id'}, status=400)
            
        try:
            from api.models import User, UserExperience
            from django.db import IntegrityError, transaction
            
            ghost_user = User.objects.get(campus_id=ghost_id)
            target_user = User.objects.get(campus_id=target_id)
            
            with transaction.atomic():
                reviews_count = ghost_user.reviews.update(user=target_user)
                comments_count = ghost_user.comments.update(user=target_user)
                events_count = ghost_user.events.update(user=target_user)
                
                votes_transferred = 0
                for vote in ghost_user.votes.all():
                    vote.user = target_user
                    try:
                        vote.save()
                        votes_transferred += 1
                    except IntegrityError:
                        vote.delete()
                        
                if hasattr(ghost_user, 'experience'):
                    target_exp, _ = UserExperience.objects.get_or_create(user=target_user)
                    target_exp.exp += ghost_user.experience.exp
                    target_exp.level = max(1, target_exp.exp // 100)
                    target_exp.save()
                    
                ghost_user.delete()
                
            return Response({
                'message': 'Success!',
                'merged_reviews': reviews_count,
                'merged_comments': comments_count,
                'merged_events': events_count,
                'merged_votes': votes_transferred
            })
            
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class RecalculateExpView(APIView):
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        try:
            from api.models import User, Review, Comment, Vote, UserExperience
            from api.domains.gamification.services import add_user_experience
            from django.db import transaction
            
            with transaction.atomic():
                UserExperience.objects.all().delete()
                
                users = User.objects.all()
                updated_count = 0
                for user in users:
                    total_exp = 0
                    
                    reviews_count = Review.objects.filter(user=user, is_deleted=False).count()
                    total_exp += (reviews_count * 25)
                    
                    comments_count = Comment.objects.filter(user=user).count()
                    total_exp += (comments_count * 10)
                    
                    likes_received = Vote.objects.filter(review__user=user, vote_type=1).count()
                    total_exp += (likes_received * 1)
                    
                    if total_exp > 0:
                        add_user_experience(user, total_exp)
                        updated_count += 1
                        
            return Response({
                'message': 'Success!',
                'users_updated': updated_count
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from api.models import User, Review
        
        total_users = User.objects.filter(is_staff=False).count()
        
        # 使用過：經驗值高過一等的0 (即 exp > 0)
        used_users = User.objects.filter(is_staff=False, experience__exp__gt=0).count()
        
        # 活躍用戶：發布心得過，且經驗值高過0
        active_users = User.objects.filter(
            is_staff=False, 
            experience__exp__gt=0, 
            reviews__isnull=False
        ).distinct().count()

        total_posts = Review.objects.filter(is_deleted=False).count()

        # 收到評論、倒讚、按讚的貼文數量
        engaged_posts = Review.objects.filter(is_deleted=False).exclude(
            comments__isnull=True, 
            votes__isnull=True
        ).count()

        active_ratio = (active_users / total_users) if total_users > 0 else 0
        usage_ratio = (used_users / total_users) if total_users > 0 else 0
        engagement_ratio = (engaged_posts / total_posts) if total_posts > 0 else 0

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'used_users': used_users,
            'active_ratio': round(active_ratio * 100, 2),
            'usage_ratio': round(usage_ratio * 100, 2),
            'total_posts': total_posts,
            'engaged_posts': engaged_posts,
            'engagement_ratio': round(engagement_ratio * 100, 2)
        })

class UserAvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response({'error': '請選擇要上傳的圖片'}, status=status.HTTP_400_BAD_REQUEST)
            
        avatar_file = request.FILES['avatar']
        
        # 檢查大小是否超過 5MB
        if avatar_file.size > 5 * 1024 * 1024:
            return Response({'error': '圖片大小不能超過 5MB'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        profile = user.profile
        
        # 刪除舊圖片以節省空間 (可選，避免佔用)
        if profile.avatar:
            profile.avatar.delete(save=False)
            
        profile.avatar = avatar_file
        profile.save()
        
        return Response({
            'message': '大頭貼上傳成功',
            'avatar_url': profile.avatar.url
        })

class PublicProfileView(APIView):
    permission_classes = (AllowAny,)
    
    def get(self, request, campus_id):
        try:
            from api.models import User, Review, Comment, Vote, Tag
            from django.db.models import Count
            
            user = User.objects.get(campus_id=campus_id)
            
            # Identity logic
            identity_label = "影迷"
            if hasattr(user, 'identity') and user.identity:
                identity_label = f"校內影迷 · {user.identity.department}"
            elif hasattr(user, 'outsider_identity') and user.outsider_identity:
                job_title = user.outsider_identity.job_title or "影迷"
                identity_label = f"校外影迷 · {job_title}"
                
            # Profile & Exp
            nickname = user.profile.nickname if hasattr(user, 'profile') else user.username
            avatar = user.profile.avatar.url if hasattr(user, 'profile') and user.profile.avatar else None
            level = user.experience.level if hasattr(user, 'experience') else 1
            
            # Stats
            reviews_count = Review.objects.filter(user=user, is_deleted=False).count()
            comments_count = Comment.objects.filter(user=user).count()
            likes_received = Vote.objects.filter(review__user=user, vote_type=1).count()
            
            # Top tags
            tags = Tag.objects.filter(
                reviews__user=user, 
                reviews__is_deleted=False
            ).annotate(
                use_count=Count('reviews')
            ).order_by('-use_count')[:3]
            top_tags = [tag.name.replace('#', '') for tag in tags]
            
            # Recent reviews
            recent_reviews_qs = Review.objects.filter(user=user, is_deleted=False).select_related('movie').order_by('-created_at')[:3]
            recent_reviews = []
            for r in recent_reviews_qs:
                content_snippet = r.content[:60] + '...' if len(r.content) > 60 else r.content
                if r.is_spoiler:
                    content_snippet = "此心得包含劇透內容。"
                recent_reviews.append({
                    'id': r.id,
                    'movie_id': r.movie.id,
                    'movie_title': r.movie.title,
                    'rating': r.rating,
                    'content': content_snippet,
                    'created_at': r.created_at
                })
                
            return Response({
                'campus_id': user.campus_id,
                'nickname': nickname,
                'avatar': avatar,
                'level': level,
                'identity_label': identity_label,
                'stats': {
                    'reviews_count': reviews_count,
                    'likes_received': likes_received,
                    'comments_count': comments_count
                },
                'top_tags': top_tags,
                'recent_reviews': recent_reviews
            })
            
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
