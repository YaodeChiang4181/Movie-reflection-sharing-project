from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from api.models import Movie
from api.domains.curated_lists.models import MovieList, MovieListItem, MovieListBookmark
from api.domains.curated_lists.serializers import (
    MovieListSerializer, MovieListCreateSerializer, MovieListUpdateSerializer,
    MovieListCardSerializer,
)
from api.domains.gamification.services import add_user_experience


class MovieListViewSet(viewsets.GenericViewSet):
    """
    主題策展片單 CRUD + 收藏 + 搜尋
    """

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'search', 'by_movie']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return MovieList.objects.filter(
            is_deleted=False, is_public=True
        ).select_related('creator', 'creator__profile', 'creator__experience').prefetch_related(
            'items', 'items__movie'
        )

    # ────────── CREATE ──────────
    def create(self, request):
        """POST /api/lists/ — 建立新片單"""
        serializer = MovieListCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # 防刷：單日上限 1 次建立
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = MovieList.objects.filter(
            creator=request.user, created_at__gte=today_start, is_deleted=False
        ).count()
        if today_count >= 1:
            return Response(
                {'error': '每日僅能建立 1 個片單，明天再來吧！'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        with transaction.atomic():
            movie_list = MovieList.objects.create(
                creator=request.user,
                title=data['title'],
                description=data.get('description', ''),
                hashtags=data.get('hashtags', []),
                is_public=data.get('is_public', True),
            )

            for item_data in data['items']:
                try:
                    movie = Movie.objects.get(id=item_data['movie_id'])
                except Movie.DoesNotExist:
                    continue
                MovieListItem.objects.create(
                    movie_list=movie_list,
                    movie=movie,
                    curator_note=item_data.get('curator_note', ''),
                    order_index=item_data.get('order_index', 0),
                )

            # 首次建立片單 +20 EXP（含至少 2 部電影才算有效）
            if movie_list.items.count() >= 2:
                add_user_experience(request.user, exp_gained=20)

        result = MovieListSerializer(movie_list, context={'request': request})
        return Response(result.data, status=status.HTTP_201_CREATED)

    # ────────── LIST (探索) ──────────
    def list(self, request):
        """GET /api/lists/ — 探索片單清單（支援 ?sort=hot|new &tag=xxx）"""
        qs = self.get_queryset()

        tag = request.query_params.get('tag')
        if tag:
            qs = qs.filter(hashtags__contains=[tag])

        sort = request.query_params.get('sort', 'hot')
        if sort == 'new':
            qs = qs.order_by('-created_at')
        else:  # hot
            qs = qs.order_by('-bookmark_count', '-created_at')

        # 簡易分頁
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 12))
        start = (page - 1) * page_size
        end = start + page_size

        results = qs[start:end]
        serializer = MovieListCardSerializer(results, many=True, context={'request': request})
        return Response({
            'results': serializer.data,
            'count': qs.count(),
            'page': page,
            'page_size': page_size,
        })

    # ────────── RETRIEVE ──────────
    def retrieve(self, request, pk=None):
        """GET /api/lists/:id/ — 片單完整詳情"""
        try:
            movie_list = self.get_queryset().get(id=pk)
        except (MovieList.DoesNotExist, ValueError):
            return Response({'error': '找不到該片單'}, status=status.HTTP_404_NOT_FOUND)

        serializer = MovieListSerializer(movie_list, context={'request': request})
        return Response(serializer.data)

    # ────────── UPDATE ──────────
    def update(self, request, pk=None):
        """PUT /api/lists/:id/ — 編輯片單（僅限策展人）"""
        try:
            movie_list = MovieList.objects.get(id=pk, is_deleted=False)
        except (MovieList.DoesNotExist, ValueError):
            return Response({'error': '找不到該片單'}, status=status.HTTP_404_NOT_FOUND)

        if movie_list.creator != request.user:
            return Response({'error': '只有策展人才能編輯片單'}, status=status.HTTP_403_FORBIDDEN)

        serializer = MovieListUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            if 'title' in data:
                movie_list.title = data['title']
            if 'description' in data:
                movie_list.description = data['description']
            if 'hashtags' in data:
                movie_list.hashtags = data['hashtags']
            if 'is_public' in data:
                movie_list.is_public = data['is_public']
            movie_list.save()

            if 'items' in data and data['items'] is not None:
                # 重建全部項目
                movie_list.items.all().delete()
                for item_data in data['items']:
                    try:
                        movie = Movie.objects.get(id=item_data['movie_id'])
                    except Movie.DoesNotExist:
                        continue
                    MovieListItem.objects.create(
                        movie_list=movie_list,
                        movie=movie,
                        curator_note=item_data.get('curator_note', ''),
                        order_index=item_data.get('order_index', 0),
                    )

        result = MovieListSerializer(movie_list, context={'request': request})
        return Response(result.data)

    # ────────── DELETE (軟刪除) ──────────
    def destroy(self, request, pk=None):
        """DELETE /api/lists/:id/ — 軟刪除片單"""
        try:
            movie_list = MovieList.objects.get(id=pk, is_deleted=False)
        except (MovieList.DoesNotExist, ValueError):
            return Response({'error': '找不到該片單'}, status=status.HTTP_404_NOT_FOUND)

        if movie_list.creator != request.user and not request.user.is_staff:
            return Response({'error': '無權限刪除此片單'}, status=status.HTTP_403_FORBIDDEN)

        movie_list.is_deleted = True
        movie_list.save(update_fields=['is_deleted'])
        return Response({'message': '片單已刪除'}, status=status.HTTP_200_OK)

    # ────────── BOOKMARK (Toggle) ──────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def bookmark(self, request, pk=None):
        """POST /api/lists/:id/bookmark/ — 切換收藏狀態"""
        try:
            movie_list = MovieList.objects.get(id=pk, is_deleted=False, is_public=True)
        except (MovieList.DoesNotExist, ValueError):
            return Response({'error': '找不到該片單'}, status=status.HTTP_404_NOT_FOUND)

        # 不能自己收藏自己的片單
        if movie_list.creator == request.user:
            return Response({'error': '不能收藏自己的片單'}, status=status.HTTP_400_BAD_REQUEST)

        bookmark, created = MovieListBookmark.objects.get_or_create(
            user=request.user, movie_list=movie_list
        )

        if created:
            # 新增收藏
            movie_list.bookmark_count = MovieListBookmark.objects.filter(movie_list=movie_list).count()
            movie_list.save(update_fields=['bookmark_count'])

            # 片單獲得收藏 → 策展人 +5 EXP（同一使用者重複取消再收藏無效，透過 unique constraint 保證）
            add_user_experience(movie_list.creator, exp_gained=5)

            return Response({
                'bookmarked': True,
                'bookmark_count': movie_list.bookmark_count
            })
        else:
            # 取消收藏
            bookmark.delete()
            movie_list.bookmark_count = MovieListBookmark.objects.filter(movie_list=movie_list).count()
            movie_list.save(update_fields=['bookmark_count'])

            return Response({
                'bookmarked': False,
                'bookmark_count': movie_list.bookmark_count
            })

    # ────────── SEARCH ──────────
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def search(self, request):
        """GET /api/lists/search/?q=xxx — 模糊搜尋片單"""
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])

        qs = self.get_queryset().filter(
            Q(title__icontains=q) |
            Q(description__icontains=q) |
            Q(hashtags__contains=[q]) |
            Q(items__movie__title__icontains=q)
        ).distinct().order_by('-bookmark_count', '-created_at')[:20]

        serializer = MovieListCardSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # ────────── BY MOVIE (雙向反查) ──────────
    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='by-movie/(?P<movie_id>[0-9]+)')
    def by_movie(self, request, movie_id=None):
        """GET /api/lists/by-movie/:movie_id/ — 反查收錄該電影的公開片單"""
        qs = self.get_queryset().filter(
            items__movie_id=movie_id
        ).distinct().order_by('-bookmark_count', '-created_at')[:10]

        serializer = MovieListCardSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # ────────── MY LISTS (我的片單) ──────────
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """GET /api/lists/mine/ — 我建立的片單"""
        qs = MovieList.objects.filter(
            creator=request.user, is_deleted=False
        ).select_related('creator', 'creator__profile', 'creator__experience').prefetch_related(
            'items', 'items__movie'
        ).order_by('-created_at')

        serializer = MovieListCardSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # ────────── MY BOOKMARKS (我的收藏片單) ──────────
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def bookmarked(self, request):
        """GET /api/lists/bookmarked/ — 我收藏的片單"""
        bookmarked_ids = MovieListBookmark.objects.filter(
            user=request.user
        ).values_list('movie_list_id', flat=True)

        qs = self.get_queryset().filter(id__in=bookmarked_ids).order_by('-created_at')
        serializer = MovieListCardSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
