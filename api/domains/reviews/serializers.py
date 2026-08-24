from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from api.models import Movie, Tag, Review, Vote, Comment
from api.domains.auth.serializers import UserSerializer
from api.utils.tmdb import fetch_movie_metadata
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
    upvotes = serializers.IntegerField(read_only=True, required=False)
    downvotes = serializers.IntegerField(read_only=True, required=False)
    user_voted = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'movie', 'movie_title', 'rating', 'content', 'source', 'is_spoiler', 'tags', 'tag_names', 'created_at', 'upvotes', 'downvotes', 'user_voted', 'comments_count')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('user'):
            data['user'] = {'campus_id': 'ghost', 'nickname': '已註銷的使用者'}
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
        
        # Automatically fetch and append TMDB genres and metadata
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
            
            review = Review.objects.create(**validated_data)
            
            for name in tag_names:
                tag, created = Tag.objects.get_or_create(name=name)
                review.tags.add(tag)
                
        return review

    def update(self, instance, validated_data):
        raw_movie_title = validated_data.pop('movie_title', None)
        tag_names = validated_data.pop('tag_names', None)

        if raw_movie_title:
            movie_title = normalize_movie_title(raw_movie_title)
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
