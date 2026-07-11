from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # 使用 campus_id 取代原本的 id 作為 Primary Key
    campus_id = models.CharField(primary_key=True, max_length=20, verbose_name="校園ID")
    
    # 取消原本 username 的唯一限制與必填，改用 campus_id 登入
    username = models.CharField(max_length=150, unique=False, null=True, blank=True)
    
    USERNAME_FIELD = 'campus_id'
    REQUIRED_FIELDS = []
    
    def __str__(self):
        return self.campus_id

class UserIdentity(models.Model):
    """機密身分表：嚴格控管存取，保護真實姓名與科系"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='identity')
    real_name = models.CharField(max_length=50, verbose_name="使用者姓名")
    department = models.CharField(max_length=100, verbose_name="科系")
    
    def __str__(self):
        return f"{self.user.campus_id} - {self.real_name}"

class UserProfile(models.Model):
    """公開主頁表：只存放公開的暱稱與設定"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    nickname = models.CharField(max_length=50, unique=True, verbose_name="登入者代碼")
    
    def __str__(self):
        return self.nickname

class Movie(models.Model):
    title = models.CharField(max_length=200)
    poster_url = models.URLField(max_length=500, blank=True, null=True)
    director = models.CharField(max_length=100)
    release_year = models.IntegerField()
    
    def __str__(self):
        return self.title

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.name

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    content = models.TextField()
    is_spoiler = models.BooleanField(default=False)
    tags = models.ManyToManyField(Tag, related_name='reviews', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.movie.title}"

class Vote(models.Model):
    VOTE_TYPES = (
        (1, 'Upvote'),
        (-1, 'Downvote'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes')
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='votes')
    vote_type = models.IntegerField(choices=VOTE_TYPES)
    
    class Meta:
        # Prevent duplicate voting at the database level
        unique_together = ('user', 'review')
        
    def __str__(self):
        return f"{self.user.username} voted {self.vote_type} on {self.review.id}"

class Event(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    event_time = models.DateTimeField()
    contact_info = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
