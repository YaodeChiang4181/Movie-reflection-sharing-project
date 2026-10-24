from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from api.models import Movie, Tag, Review, Vote, Comment
from api.domains.auth.serializers import UserSerializer
from api.utils.tmdb import fetch_movie_metadata, fetch_movie_metadata_by_id
from api.utils.text_utils import normalize_movie_title
from api.utils.sanitizer import sanitize_plain_text

class MovieSerializer(serializers.ModelSerializer):
    avg_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Movie
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'is_system')

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ('id', 'review', 'user', 'content', 'created_at')
        read_only_fields = ('review',)

    def validate_content(self, value):
        if value:
            return sanitize_plain_text(value)
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
    media_type = serializers.CharField(write_only=True, required=False)
    upvotes = serializers.IntegerField(read_only=True, required=False)
    downvotes = serializers.IntegerField(read_only=True, required=False)
    user_voted = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    effective_date = serializers.SerializerMethodField()
    display_date = serializers.DateTimeField(required=False, allow_null=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'movie', 'movie_title', 'tmdb_id', 'media_type', 'rating', 'content', 'source', 'is_spoiler', 'tags', 'tag_names', 'created_at', 'display_date', 'effective_date', 'upvotes', 'downvotes', 'user_voted', 'comments_count')

    def get_comments_count(self, obj):
        val = getattr(obj, 'comments_count', None)
        if val is not None:
            return val
        return obj.comments.count()



    def get_effective_date(self, obj):
        return obj.display_date or obj.created_at

    def validate(self, data):
        rating = data.get('rating')
        content = data.get('content', '').strip()
        if not rating and not content:
            raise serializers.ValidationError("至少需要填寫評分或心得內容其中之一。")
        return data

    def validate_content(self, value):
        if value:
            return sanitize_plain_text(value)
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Filter out system tags (except movie title)
        filtered_tags = []
        for tag in data.get('tags', []):
            if not tag.get('is_system') or tag.get('name') == instance.movie.title:
                filtered_tags.append(tag)
        data['tags'] = filtered_tags

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
                normal_review_count=Count('reviews', filter=Q(reviews__is_deleted=False) & Q(reviews__content__gt=""))
            ).order_by('-normal_review_count', '-review_count', '-id')[:20]
            top_20_ids = list(top_movies.values_list('id', flat=True))
            cache.set(cache_key, top_20_ids, 60 * 10) # Cache for 10 mins
            
        if instance.movie_id in top_20_ids:
            data['tags'].extend([{'id': -1, 'name': '熱門討論', 'is_system': True}, {'id': -2, 'name': '社群精選', 'is_system': True}])
        else:
            data['tags'].extend([{'id': -3, 'name': '新鮮討論', 'is_system': True}, {'id': -4, 'name': '冷門話題', 'is_system': True}])
            
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
        raw_tag_names = validated_data.pop('tag_names', [])
        tag_names = list(raw_tag_names) if raw_tag_names is not None else []
        tmdb_id = validated_data.pop('tmdb_id', None)
        media_type = validated_data.pop('media_type', None)
        
        # Fetch metadata using tmdb_id if provided, else fallback to title search
        if tmdb_id:
            tmdb_meta = fetch_movie_metadata_by_id(tmdb_id, media_type=media_type)
        else:
            tmdb_meta = fetch_movie_metadata(movie_title)
            
        tmdb_genres = tmdb_meta['genres'] if tmdb_meta else []
        for genre in tmdb_genres:
            if genre not in tag_names:
                tag_names.append(genre)
        
        # Ensure movie_title is always a tag
        if movie_title not in tag_names:
            tag_names.append(movie_title)
                
        with transaction.atomic():
            movie_defaults = {
                'director': '', 
                'release_year': timezone.now().year,
                'media_type': media_type or 'movie'
            }
            if tmdb_meta:
                if tmdb_meta.get('original_title'):
                    movie_defaults['original_title'] = tmdb_meta['original_title']
                if tmdb_meta.get('tmdb_id'):
                    movie_defaults['tmdb_id'] = tmdb_meta['tmdb_id']
                if tmdb_meta.get('poster_url'):
                    movie_defaults['poster_url'] = tmdb_meta['poster_url']
                if tmdb_meta.get('release_year'):
                    movie_defaults['release_year'] = tmdb_meta['release_year']
                if tmdb_meta.get('media_type'):
                    movie_defaults['media_type'] = tmdb_meta['media_type']

            movie, created = Movie.objects.get_or_create(
                title=movie_title,
                defaults=movie_defaults
            )
            if not created and tmdb_meta and tmdb_meta.get('media_type'):
                if movie.media_type != tmdb_meta['media_type']:
                    movie.media_type = tmdb_meta['media_type']
                    movie.save(update_fields=['media_type'])
            validated_data['movie'] = movie
            
            user = validated_data.get('user') or (self.context.get('request') and self.context['request'].user)
            if user and user.is_authenticated:
                content_val = validated_data.get('content', '') or ''
                content_str = content_val.strip()
                is_rapid_rating = (
                    "急速評星" in tag_names or 
                    not content_str or 
                    content_str == "來自急速評星的無內文評價"
                )
                
                existing_reviews = Review.objects.filter(user=user, movie=movie, is_deleted=False)
                
                from django.db.models import Q
                rapid_condition = (
                    Q(tags__name="急速評星") |
                    Q(content="來自急速評星的無內文評價") |
                    Q(content="") |
                    Q(content__isnull=True)
                )
                
                existing_rapid = existing_reviews.filter(rapid_condition).first()
                existing_normal = existing_reviews.exclude(rapid_condition).first()
                
                if is_rapid_rating:
                    # 避免重複急速評星：若已存在急速評星紀錄，直接平滑更新評分，不新增第二筆
                    if existing_rapid:
                        new_rating = validated_data.get('rating')
                        if new_rating is not None:
                            existing_rapid.rating = new_rating
                        existing_rapid.updated_at = timezone.now()
                        existing_rapid.save(update_fields=['rating', 'updated_at'])
                        for name in tag_names:
                            is_sys = name == movie_title or name in (tmdb_genres if 'tmdb_genres' in locals() else [])
                            tag, created = Tag.objects.get_or_create(
                                name=name,
                                defaults={'is_system': is_sys}
                            )
                            existing_rapid.tags.add(tag)
                        return existing_rapid
                    elif existing_normal:
                        raise serializers.ValidationError("您已經針對此電影撰寫過一般心得。")
                else:
                    if existing_normal:
                        raise serializers.ValidationError("您已經針對此電影撰寫過一般心得。")
                    elif existing_rapid:
                        # 將既有的急速評星升級為正式完整心得，避免同一作品有兩筆紀錄
                        existing_rapid.content = content_val
                        if validated_data.get('rating') is not None:
                            existing_rapid.rating = validated_data.get('rating')
                        existing_rapid.is_spoiler = validated_data.get('is_spoiler', False)
                        if validated_data.get('display_date'):
                            existing_rapid.display_date = validated_data.get('display_date')
                        existing_rapid.updated_at = timezone.now()
                        existing_rapid.save()
                        # 移除急速評星標籤
                        existing_rapid.tags.remove(*existing_rapid.tags.filter(name="急速評星"))
                        for name in tag_names:
                            is_sys = name == movie_title or name in (tmdb_genres if 'tmdb_genres' in locals() else [])
                            tag, created = Tag.objects.get_or_create(
                                name=name,
                                defaults={'is_system': is_sys}
                            )
                            existing_rapid.tags.add(tag)
                        return existing_rapid
            
            review = Review.objects.create(**validated_data)
            
            for name in tag_names:
                is_sys = name == movie_title or name in (tmdb_genres if 'tmdb_genres' in locals() else [])
                tag, created = Tag.objects.get_or_create(
                    name=name,
                    defaults={'is_system': is_sys}
                )
                if not created and is_sys and not tag.is_system:
                    tag.is_system = True
                    tag.save(update_fields=['is_system'])
                review.tags.add(tag)
                
        return review

    def update(self, instance, validated_data):
        raw_movie_title = validated_data.pop('movie_title', None)
        raw_tag_names = validated_data.pop('tag_names', None)
        tag_names = list(raw_tag_names) if raw_tag_names is not None else None
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
                if movie_title not in tag_names:
                    tag_names.append(movie_title)

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
                tmdb_genres = tmdb_meta['genres'] if ('tmdb_meta' in locals() and tmdb_meta) else []
                for name in tag_names:
                    is_sys = name == instance.movie.title or name in tmdb_genres
                    tag, created = Tag.objects.get_or_create(
                        name=name,
                        defaults={'is_system': is_sys}
                    )
                    if not created and is_sys and not tag.is_system:
                        tag.is_system = True
                        tag.save(update_fields=['is_system'])
                    instance.tags.add(tag)

        return instance

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ('id', 'user', 'review', 'vote_type')
        read_only_fields = ('user',)
