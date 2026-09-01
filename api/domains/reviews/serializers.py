from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from api.models import Movie, Tag, Review, Vote, Comment
from api.domains.auth.serializers import UserSerializer
from api.utils.tmdb import fetch_movie_metadata, fetch_movie_metadata_by_id
from api.utils.text_utils import normalize_movie_title

class MovieSerializer(serializers.ModelSerializer):
    avg_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

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

    def validate_content(self, value):
        import bleach
        if value:
            return bleach.clean(value, tags=[], attributes={}, strip=True)
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('user'):
            data['user'] = {'campus_id': 'ghost', 'nickname': '已註銷的使用者'}
        return data

class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    movie_title = serializers.CharField(write_only=True)
    movie = MovieSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50), write_only=True, required=False
    )
    tmdb_id = serializers.IntegerField(write_only=True, required=False)
    upvotes = serializers.IntegerField(read_only=True, required=False)
    downvotes = serializers.IntegerField(read_only=True, required=False)
    user_voted = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'movie', 'movie_title', 'tmdb_id', 'rating', 'content', 'source', 'is_spoiler', 'tags', 'tag_names', 'created_at', 'upvotes', 'downvotes', 'user_voted', 'comments_count')

    def validate_content(self, value):
        import bleach
        if value:
            return bleach.clean(value, tags=[], attributes={}, strip=True)
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('user'):
            data['user'] = {'campus_id': 'ghost', 'nickname': '已註銷的使用者'}
            
        # Add dynamic movie rank tags
        from django.core.cache import cache
        from django.db.models import Count, Q
        
        cache_key = 'top_20_movie_ids'
        top_20_ids = cache.get(cache_key)
        
        if top_20_ids is None:
            # Calculate top 20 movies (same logic as MovieViewSet)
            top_movies = Movie.objects.annotate(
                review_count=Count('reviews', filter=Q(reviews__is_deleted=False)),
                normal_review_count=Count('reviews', filter=Q(reviews__is_deleted=False) & ~Q(reviews__content=""))
            ).order_by('-normal_review_count', '-review_count', '-id')[:20]
            top_20_ids = list(top_movies.values_list('id', flat=True))
            cache.set(cache_key, top_20_ids, 60 * 10) # Cache for 10 mins
            
        if instance.movie_id in top_20_ids:
            data['tags'].extend([{'id': -1, 'name': '熱門討論'}, {'id': -2, 'name': '社群精選'}])
        else:
            data['tags'].extend([{'id': -3, 'name': '新鮮討論'}, {'id': -4, 'name': '冷門話題'}])
            
        return data

    def get_user_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = Vote.objects.filter(review=obj, user=request.user).first()
            if vote:
                return vote.vote_type
        return 0

    def create(self, validated_data):
        raw_movie_title = validated_data.pop('movie_title')
        movie_title = normalize_movie_title(raw_movie_title)
        tag_names = validated_data.pop('tag_names', [])
        tmdb_id = validated_data.pop('tmdb_id', None)
        
        # Fetch metadata using tmdb_id if provided, else fallback to title search
        if tmdb_id:
            tmdb_meta = fetch_movie_metadata_by_id(tmdb_id)
        else:
            tmdb_meta = fetch_movie_metadata(movie_title)
            
        tmdb_genres = tmdb_meta['genres'] if tmdb_meta else []
        for genre in tmdb_genres:
            if genre not in tag_names:
                tag_names.append(genre)
                
        with transaction.atomic():
            movie_defaults = {'director': 'Unknown', 'release_year': timezone.now().year}
            if tmdb_meta:
                if tmdb_meta.get('original_title'):
                    movie_defaults['original_title'] = tmdb_meta['original_title']
                if tmdb_meta.get('tmdb_id'):
                    movie_defaults['tmdb_id'] = tmdb_meta['tmdb_id']
                if tmdb_meta.get('poster_url'):
                    movie_defaults['poster_url'] = tmdb_meta['poster_url']

            movie, _ = Movie.objects.get_or_create(
                title=movie_title,
                defaults=movie_defaults
            )
            validated_data['movie'] = movie
            
            user = validated_data.get('user')
            if user:
                content_val = validated_data.get('content', '').strip()
                is_rapid_rating = "急速評星" in tag_names or not content_val or content_val == "來自急速評星的無內文評價"
                
                existing_reviews = Review.objects.filter(user=user, movie=movie)
                
                from django.db.models import Q
                rapid_condition = Q(tags__name="急速評星") | Q(content="") | Q(content="來自急速評星的無內文評價")
                
                has_rapid = existing_reviews.filter(rapid_condition).exists()
                has_normal = existing_reviews.exclude(rapid_condition).exists()
                
                if is_rapid_rating and has_rapid:
                    raise serializers.ValidationError("您已經針對此電影送出過急速評星。")
                elif not is_rapid_rating and has_normal:
                    raise serializers.ValidationError("您已經針對此電影撰寫過一般心得。")
            
            review = Review.objects.create(**validated_data)
            
            for name in tag_names:
                tag, created = Tag.objects.get_or_create(name=name)
                review.tags.add(tag)
                
        return review

    def update(self, instance, validated_data):
        raw_movie_title = validated_data.pop('movie_title', None)
        tag_names = validated_data.pop('tag_names', None)
        tmdb_id = validated_data.pop('tmdb_id', None)

        if raw_movie_title:
            movie_title = normalize_movie_title(raw_movie_title)
            if tmdb_id:
                tmdb_meta = fetch_movie_metadata_by_id(tmdb_id)
            else:
                tmdb_meta = fetch_movie_metadata(movie_title)
            
            if tag_names is not None:
                tmdb_genres = tmdb_meta['genres'] if tmdb_meta else []
                for genre in tmdb_genres:
                    if genre not in tag_names:
                        tag_names.append(genre)

        with transaction.atomic():
            if raw_movie_title:
                movie_title = normalize_movie_title(raw_movie_title)
                movie_defaults = {'director': 'Unknown', 'release_year': timezone.now().year}
                if tmdb_meta:
                    if tmdb_meta.get('original_title'):
                        movie_defaults['original_title'] = tmdb_meta['original_title']
                    if tmdb_meta.get('tmdb_id'):
                        movie_defaults['tmdb_id'] = tmdb_meta['tmdb_id']
                    if tmdb_meta.get('poster_url'):
                        movie_defaults['poster_url'] = tmdb_meta['poster_url']

                movie, _ = Movie.objects.get_or_create(
                    title=movie_title,
                    defaults=movie_defaults
                )
                instance.movie = movie

            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if tag_names is not None:
                instance.tags.clear()
                for name in tag_names:
                    tag, _ = Tag.objects.get_or_create(name=name)
                    instance.tags.add(tag)

        return instance

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ('id', 'user', 'review', 'vote_type')
        read_only_fields = ('user',)
