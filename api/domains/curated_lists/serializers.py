from rest_framework import serializers
from api.models import Movie, UserProfile, UserExperience
from api.domains.curated_lists.models import MovieList, MovieListItem, MovieListBookmark


class ListItemMovieSerializer(serializers.ModelSerializer):
    """片單內電影的精簡序列化（僅前端顯示所需欄位）"""
    class Meta:
        model = Movie
        fields = ('id', 'title', 'original_title', 'poster_url', 'tmdb_id', 'release_year')


class MovieListItemSerializer(serializers.ModelSerializer):
    movie = ListItemMovieSerializer(read_only=True)
    movie_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = MovieListItem
        fields = ('id', 'movie', 'movie_id', 'curator_note', 'order_index')
        read_only_fields = ('id',)


class MovieListItemWriteSerializer(serializers.Serializer):
    """建立/編輯片單時使用的項目寫入格式"""
    movie_id = serializers.IntegerField()
    curator_note = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    order_index = serializers.IntegerField(required=False, default=0)


class CreatorInfoSerializer(serializers.Serializer):
    """策展人公開資訊"""
    campus_id = serializers.CharField()
    nickname = serializers.CharField()
    avatar = serializers.SerializerMethodField()
    level = serializers.IntegerField()

    def get_avatar(self, obj):
        if obj.get('avatar'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj['avatar'])
        return None


class MovieListSerializer(serializers.ModelSerializer):
    """片單完整序列化（含策展人資訊與項目清單）"""
    items = MovieListItemSerializer(many=True, read_only=True)
    creator_info = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    cover_posters = serializers.SerializerMethodField()

    class Meta:
        model = MovieList
        fields = (
            'id', 'title', 'description', 'hashtags', 'is_public',
            'bookmark_count', 'created_at', 'updated_at',
            'creator_info', 'items', 'is_bookmarked', 'cover_posters'
        )
        read_only_fields = ('id', 'bookmark_count', 'created_at', 'updated_at')

    def get_creator_info(self, obj):
        user = obj.creator
        try:
            profile = user.profile
            nickname = profile.nickname
            avatar = profile.avatar.url if profile.avatar else None
        except UserProfile.DoesNotExist:
            nickname = user.campus_id
            avatar = None

        try:
            level = user.experience.level
        except UserExperience.DoesNotExist:
            level = 1

        data = {
            'campus_id': user.campus_id,
            'nickname': nickname,
            'avatar': avatar,
            'level': level,
        }
        return CreatorInfoSerializer(data, context=self.context).data

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return MovieListBookmark.objects.filter(
                user=request.user, movie_list=obj
            ).exists()
        return False

    def get_cover_posters(self, obj):
        """回傳前 4 部電影的海報 URL，供 2x2 四宮格封面使用"""
        items = obj.items.select_related('movie').order_by('order_index')[:4]
        return [item.movie.poster_url for item in items if item.movie.poster_url]


class MovieListCreateSerializer(serializers.Serializer):
    """建立片單的專用序列化器"""
    title = serializers.CharField(max_length=60)
    description = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
    hashtags = serializers.ListField(
        child=serializers.CharField(max_length=30),
        required=False, default=list
    )
    is_public = serializers.BooleanField(default=True)
    items = MovieListItemWriteSerializer(many=True)

    def validate_title(self, value):
        import bleach
        return bleach.clean(value, tags=[], attributes={}, strip=True).strip()

    def validate_description(self, value):
        import bleach
        return bleach.clean(value, tags=[], attributes={}, strip=True).strip()

    def validate_items(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("片單至少需要包含 2 部電影。")
        if len(value) > 15:
            raise serializers.ValidationError("片單最多只能包含 15 部電影。")
        return value

    def validate_hashtags(self, value):
        if len(value) > 5:
            raise serializers.ValidationError("最多只能設定 5 個主題標籤。")
        import bleach
        return [bleach.clean(tag, tags=[], attributes={}, strip=True).strip().lstrip('#') for tag in value]


class MovieListUpdateSerializer(serializers.Serializer):
    """編輯片單的專用序列化器"""
    title = serializers.CharField(max_length=60, required=False)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    hashtags = serializers.ListField(
        child=serializers.CharField(max_length=30),
        required=False
    )
    is_public = serializers.BooleanField(required=False)
    items = MovieListItemWriteSerializer(many=True, required=False)

    def validate_title(self, value):
        import bleach
        return bleach.clean(value, tags=[], attributes={}, strip=True).strip()

    def validate_description(self, value):
        import bleach
        return bleach.clean(value, tags=[], attributes={}, strip=True).strip()

    def validate_items(self, value):
        if value is not None:
            if len(value) < 2:
                raise serializers.ValidationError("片單至少需要包含 2 部電影。")
            if len(value) > 15:
                raise serializers.ValidationError("片單最多只能包含 15 部電影。")
        return value

    def validate_hashtags(self, value):
        if value is not None and len(value) > 5:
            raise serializers.ValidationError("最多只能設定 5 個主題標籤。")
        import bleach
        return [bleach.clean(tag, tags=[], attributes={}, strip=True).strip().lstrip('#') for tag in value] if value else value


class MovieListCardSerializer(serializers.ModelSerializer):
    """搜尋結果 / 片單卡片用精簡序列化"""
    creator_info = serializers.SerializerMethodField()
    cover_posters = serializers.SerializerMethodField()
    movie_titles_preview = serializers.SerializerMethodField()

    class Meta:
        model = MovieList
        fields = (
            'id', 'title', 'description', 'hashtags',
            'bookmark_count', 'created_at',
            'creator_info', 'cover_posters', 'movie_titles_preview'
        )

    def get_creator_info(self, obj):
        user = obj.creator
        try:
            profile = user.profile
            nickname = profile.nickname
        except UserProfile.DoesNotExist:
            nickname = user.campus_id
        try:
            level = user.experience.level
        except UserExperience.DoesNotExist:
            level = 1
        return {'campus_id': user.campus_id, 'nickname': nickname, 'level': level}

    def get_cover_posters(self, obj):
        items = obj.items.select_related('movie').order_by('order_index')[:4]
        return [item.movie.poster_url for item in items if item.movie.poster_url]

    def get_movie_titles_preview(self, obj):
        items = obj.items.select_related('movie').order_by('order_index')[:5]
        return [item.movie.title for item in items]
