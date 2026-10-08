import uuid
from django.db import models


class MovieList(models.Model):
    """主題策展片單主表"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(
        'api.User', on_delete=models.CASCADE, related_name='curated_lists',
        verbose_name="策展人"
    )
    title = models.CharField(max_length=60, verbose_name="片單標題")
    description = models.CharField(max_length=255, blank=True, default='', verbose_name="情境引言")
    hashtags = models.JSONField(default=list, blank=True, verbose_name="主題標籤")  # e.g. ["雨天", "燒腦"]
    is_public = models.BooleanField(default=True, verbose_name="是否公開")
    is_deleted = models.BooleanField(default=False, verbose_name="是否已刪除")
    bookmark_count = models.IntegerField(default=0, verbose_name="收藏次數")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['creator']),
            models.Index(fields=['-bookmark_count', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} (by {self.creator})"


class MovieListItem(models.Model):
    """片單收錄項目表（含排序與一句話短註）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movie_list = models.ForeignKey(
        MovieList, on_delete=models.CASCADE, related_name='items',
        verbose_name="所屬片單"
    )
    movie = models.ForeignKey(
        'api.Movie', on_delete=models.CASCADE, related_name='list_appearances',
        verbose_name="電影"
    )
    curator_note = models.CharField(max_length=100, blank=True, default='', verbose_name="策展人短註")
    order_index = models.IntegerField(default=0, verbose_name="排列順序")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order_index']
        unique_together = ('movie_list', 'movie')

    def __str__(self):
        return f"{self.movie_list.title} -> {self.movie.title} (#{self.order_index})"


class MovieListBookmark(models.Model):
    """片單收藏紀錄表（防重複點擊）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'api.User', on_delete=models.CASCADE, related_name='list_bookmarks',
        verbose_name="收藏者"
    )
    movie_list = models.ForeignKey(
        MovieList, on_delete=models.CASCADE, related_name='bookmarks',
        verbose_name="片單"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'movie_list')

    def __str__(self):
        return f"{self.user} bookmarked {self.movie_list.title}"
