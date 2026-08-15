from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from api.models import Movie, Tag, Review, Vote, Comment
from api.domains.auth.serializers import UserSerializer
from api.utils.tmdb import fetch_movie_genres

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

    def get_user_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = Vote.objects.filter(review=obj, user=request.user).first()
            if vote:
                return vote.vote_type
        return 0

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        movie_title = validated_data.pop('movie_title')
        
        # Automatically fetch and append TMDB genres
        tmdb_genres = fetch_movie_genres(movie_title)
        for genre in tmdb_genres:
            if genre not in tag_names:
                tag_names.append(genre)
                
        with transaction.atomic():
            movie, _ = Movie.objects.get_or_create(
                title=movie_title,
                defaults={'director': 'Unknown', 'release_year': timezone.now().year}
            )
            validated_data['movie'] = movie
            
            review = Review.objects.create(**validated_data)
            
            for name in tag_names:
                tag, created = Tag.objects.get_or_create(name=name)
                review.tags.add(tag)
                
        return review

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tag_names', None)
        movie_title = validated_data.pop('movie_title', None)

        if movie_title and tag_names is not None:
            tmdb_genres = fetch_movie_genres(movie_title)
            for genre in tmdb_genres:
                if genre not in tag_names:
                    tag_names.append(genre)

        with transaction.atomic():
            if movie_title:
                movie, _ = Movie.objects.get_or_create(
                    title=movie_title,
                    defaults={'director': 'Unknown', 'release_year': timezone.now().year}
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
