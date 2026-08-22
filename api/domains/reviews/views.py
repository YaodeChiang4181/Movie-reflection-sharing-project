from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny, IsAdminUser
from django.db import IntegrityError
from django.db.models import Count, Q, Case, When, Value, IntegerField, Avg
from django.db.models.functions import Length, Replace
from django.core.cache import cache
from api.models import Movie, Review, Vote, Comment
from .serializers import MovieSerializer, ReviewSerializer, CommentSerializer

class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Movie.objects.annotate(
        avg_rating=Avg('reviews__rating', filter=Q(reviews__is_deleted=False)),
        review_count=Count('reviews', filter=Q(reviews__is_deleted=False)),
        normal_review_count=Count('reviews', filter=Q(reviews__is_deleted=False) & ~Q(reviews__content=""))
    ).filter(review_count__gt=0).order_by('-normal_review_count', '-review_count', '-id')
    serializer_class = MovieSerializer
    permission_classes = (AllowAny,)

    @action(detail=True, methods=['get'])
    def related(self, request, pk=None):
        movie = self.get_object()
        
        # Get all distinct tag IDs used in the reviews of this movie
        tag_ids = [tid for tid in movie.reviews.values_list('tags', flat=True).distinct() if tid is not None]
        
        if not tag_ids:
            # If no tags, just return trending movies (fallback)
            related_movies = self.get_queryset().exclude(id=movie.id)[:5]
        else:
            # Find movies sharing these tags, annotate with match count
            related_movies = self.get_queryset().exclude(id=movie.id).filter(
                reviews__tags__id__in=tag_ids
            ).annotate(
                match_count=Count('reviews__tags', distinct=True)
            ).order_by('-match_count', '-normal_review_count', '-review_count', '-id')[:5]
            
            # If less than 5 movies share tags, pad with trending movies
            if len(related_movies) < 5:
                existing_ids = [m.id for m in related_movies]
                padding = self.get_queryset().exclude(id__in=[movie.id] + existing_ids)[:5 - len(related_movies)]
                related_movies = list(related_movies) + list(padding)
                
        serializer = self.get_serializer(related_movies, many=True)
        return Response(serializer.data)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    
    def get_queryset(self):
        qs = Review.objects.filter(is_deleted=False).annotate(
            upvotes=Count('votes', filter=Q(votes__vote_type=1)),
            downvotes=Count('votes', filter=Q(votes__vote_type=-1))
        )
        movie_id = self.request.query_params.get('movie')
        if movie_id:
            qs = qs.filter(movie_id=movie_id)
            
        sort = self.request.query_params.get('sort')
        if sort == 'hot':
            qs = qs.order_by('-upvotes', '-created_at')
        elif sort == 'oldest':
            qs = qs.order_by('created_at')
        else:
            qs = qs.order_by('-created_at')
            
        return qs
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        cache.delete('trending_reviews')

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user and not request.user.is_staff:
            return Response({"error": "You don't have permission to delete this review."}, status=status.HTTP_403_FORBIDDEN)
        
        review.is_deleted = True
        review.save()
        cache.delete('trending_reviews')
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user and not request.user.is_staff:
            return Response({"error": "You don't have permission to edit this review."}, status=status.HTTP_403_FORBIDDEN)
        response = super().partial_update(request, *args, **kwargs)
        cache.delete('trending_reviews')
        return response

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def deleted_reviews(self, request):
        deleted = Review.objects.filter(is_deleted=True).annotate(
            upvotes=Count('votes', filter=Q(votes__vote_type=1)),
            downvotes=Count('votes', filter=Q(votes__vote_type=-1))
        ).order_by('-created_at')
        serializer = self.get_serializer(deleted, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAdminUser])
    def force_delete(self, request, pk=None):
        review = Review.objects.filter(pk=pk).first()
        if not review:
            return Response(status=status.HTTP_404_NOT_FOUND)
        review.delete()
        cache.delete('trending_reviews')
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def restore(self, request, pk=None):
        review = Review.objects.filter(pk=pk).first()
        if not review:
            return Response(status=status.HTTP_404_NOT_FOUND)
        review.is_deleted = False
        review.save()
        cache.delete('trending_reviews')
        return Response({"message": "Review restored."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        user_reviews = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(user_reviews, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def commented_by_me(self, request):
        reviews = self.get_queryset().filter(comments__user=request.user).distinct()
        serializer = self.get_serializer(reviews, many=True)
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
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response([])
        query_len = len(query)

        results = self.get_queryset().filter(
            Q(movie__title__icontains=query) | Q(content__icontains=query) | Q(tags__name__icontains=query)
        ).distinct().annotate(
            match_priority=Case(
                When(movie__title__icontains=query, then=Value(1)),
                When(content__icontains=query, then=Value(2)),
                When(tags__name__icontains=query, then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            ),
            occurrences=Case(
                When(content__icontains=query, then=(Length('content') - Length(Replace('content', Value(query), Value('')))) / query_len),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by('match_priority', '-occurrences', '-created_at')

        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def trending(self, request):
        cache_key = 'trending_reviews'
        cached_data = cache.get(cache_key)
        
        if not cached_data:
            trending_reviews = self.get_queryset().order_by('-upvotes', '-created_at')[:10]
            serializer = self.get_serializer(trending_reviews, many=True)
            cached_data = serializer.data
            cache.set(cache_key, cached_data, 60 * 10)
            
        response_data = []
        user = request.user
        user_votes = set()
        
        if user.is_authenticated:
            review_ids = [item['id'] for item in cached_data]
            user_votes = set(Vote.objects.filter(user=user, review_id__in=review_ids).values_list('review_id', flat=True))
            
        for item in cached_data:
            new_item = dict(item)
            new_item['user_voted'] = new_item['id'] in user_votes
            response_data.append(new_item)
            
        return Response(response_data)
