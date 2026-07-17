from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer, UserMeSerializer

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
    serializer_class = UserMeSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        # 列出所有非管理員的使用者
        return User.objects.filter(is_staff=False).order_by('-date_joined')

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        # 額外確認不能刪除管理員
        if user.is_staff:
            return Response({"error": "Cannot delete admin user"}, status=status.HTTP_403_FORBIDDEN)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from django.db import IntegrityError
from django.db.models import Sum, F, Count
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from .models import Movie, Tag, Review, Vote, Event, Comment
from .serializers import MovieSerializer, TagSerializer, ReviewSerializer, VoteSerializer, EventSerializer, CommentSerializer

class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    permission_classes = (AllowAny,)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    
    def get_queryset(self):
        return Review.objects.annotate(score=Count('votes')).order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        # 清除快取，讓首頁立刻更新
        cache.delete('trending_reviews')

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user and not request.user.is_staff:
            return Response({"error": "You don't have permission to delete this review."}, status=status.HTTP_403_FORBIDDEN)
        response = super().destroy(request, *args, **kwargs)
        cache.delete('trending_reviews')
        return response

    def partial_update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user and not request.user.is_staff:
            return Response({"error": "You don't have permission to edit this review."}, status=status.HTTP_403_FORBIDDEN)
        response = super().partial_update(request, *args, **kwargs)
        cache.delete('trending_reviews')
        return response

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        # 嚴格過濾出該名使用者的發文
        user_reviews = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(user_reviews, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        review = self.get_object()
        user = request.user
        vote_type = request.data.get('vote_type')
        
        if vote_type not in [1, -1]:
            return Response({"error": "vote_type must be 1 (Upvote) or -1 (Downvote)."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            existing_vote = Vote.objects.filter(user=user, review=review).first()
            msg = ""
            if existing_vote:
                if existing_vote.vote_type == vote_type:
                    existing_vote.delete()
                    msg = "Vote removed."
                else:
                    existing_vote.vote_type = vote_type
                    existing_vote.save()
                    msg = "Vote updated."
            else:
                Vote.objects.create(user=user, review=review, vote_type=vote_type)
                msg = "Vote added."
                
            cache.delete('trending_reviews')
            return Response({"message": msg}, status=status.HTTP_200_OK)
                
        except IntegrityError:
            return Response({"error": "Concurrent vote detection failed."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        review = self.get_object()
        if request.method == 'GET':
            comments = review.comments.all().order_by('-created_at')
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            content = request.data.get('content')
            if not content:
                return Response({"error": "Content is required"}, status=status.HTTP_400_BAD_REQUEST)
            comment = Comment.objects.create(review=review, user=request.user, content=content)
            cache.delete('trending_reviews')
            serializer = CommentSerializer(comment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def trending(self, request):
        # 實作排行榜快取機制 (10 分鐘)
        cache_key = 'trending_reviews'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        # 撈取近 7 日內的文章，並依據推薦人數 (score) 排行
        seven_days_ago = timezone.now() - timedelta(days=7)
        trending_reviews = self.get_queryset().filter(
            created_at__gte=seven_days_ago
        ).order_by('-score', '-created_at')[:10]
        
        serializer = self.get_serializer(trending_reviews, many=True)
        
        # 寫入快取
        cache.set(cache_key, serializer.data, 60 * 10)
        
        return Response(serializer.data)

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('event_time')
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

