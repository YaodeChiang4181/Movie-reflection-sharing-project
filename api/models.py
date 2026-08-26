import random
import string
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator

class User(AbstractUser):
    # 使用 campus_id 取代原本的 id 作為 Primary Key，強制 9 碼數字或英文字母 (校外人士使用字母)
    campus_id = models.CharField(
        primary_key=True, 
        max_length=9, 
        validators=[RegexValidator(r'^[a-zA-Z0-9]{9}$', message="學號必須為 9 位英數字")],
        verbose_name="帳號ID"
    )
    
    # 取消原本 username 的唯一限制與必填，改用 campus_id 登入
    username = models.CharField(max_length=150, unique=False, null=True, blank=True)
    
    # LINE 整合
    line_user_id = models.CharField(max_length=100, unique=True, null=True, blank=True, verbose_name="LINE User ID")
    line_display_name = models.CharField(max_length=100, null=True, blank=True, verbose_name="LINE 顯示名稱")
    
    # Google 整合
    google_user_id = models.CharField(max_length=100, unique=True, null=True, blank=True, verbose_name="Google User ID")
    
    USERNAME_FIELD = 'campus_id'
    REQUIRED_FIELDS = []
    
    def __str__(self):
        return self.campus_id

class UserIdentity(models.Model):
    """機密身分表：嚴格控管存取，保護真實姓名與科系"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='identity')
    real_name = models.CharField(max_length=50, verbose_name="使用者姓名")
    department = models.CharField(max_length=100, verbose_name="科系")
    school_email = models.EmailField(unique=True, verbose_name="學校信箱")
    
    def __str__(self):
        return f"{self.user.campus_id} - {self.real_name}"

class UserProfile(models.Model):
    """公開主頁表：只存放公開的暱稱與設定"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    nickname = models.CharField(max_length=50, unique=True, verbose_name="登入者代碼")
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name="大頭貼")
    
    def __str__(self):
        return self.nickname

class OutsiderIdentity(models.Model):
    """校外人士資料表：紀錄校外人士的姓名、信箱與職業"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='outsider_identity')
    real_name = models.CharField(max_length=50, verbose_name="使用者姓名")
    email = models.EmailField(unique=True, verbose_name="聯絡信箱")
    occupation = models.CharField(max_length=100, verbose_name="職業")
    
    def __str__(self):
        return f"{self.user.campus_id} - {self.real_name}"

class Advertisement(models.Model):
    title = models.CharField(max_length=200, verbose_name="廣告標題")
    image = models.ImageField(upload_to='ads/', verbose_name="廣告圖片")
    url = models.URLField(max_length=500, blank=True, null=True, verbose_name="廣告連結")
    is_active = models.BooleanField(default=True, verbose_name="是否上架")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="建立時間")
    
    def __str__(self):
        return self.title

class Movie(models.Model):
    title = models.CharField(max_length=200)
    original_title = models.CharField(max_length=200, blank=True, null=True)
    tmdb_id = models.IntegerField(blank=True, null=True)
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
    REVIEW_SOURCES = (
        ('web', 'Web'),
        ('line', 'LINE'),
    )
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reviews')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    content = models.TextField()
    source = models.CharField(max_length=10, choices=REVIEW_SOURCES, default='web', verbose_name="來源")
    is_spoiler = models.BooleanField(default=False)
    tags = models.ManyToManyField(Tag, related_name='reviews', blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
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
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='events')
    title = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    event_time = models.DateTimeField()
    organizer_nickname = models.CharField(max_length=200, default='')
    description = models.TextField(default="")
    join_code = models.CharField(max_length=10, unique=True, blank=True)
    attendees = models.ManyToManyField(User, related_name='joined_events', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.join_code:
            # 產生 6 碼英數混合的大寫代碼
            self.join_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            # 確保代碼不重複
            while Event.objects.filter(join_code=self.join_code).exists():
                self.join_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.join_code})"

class Comment(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.content[:20]}"

class EmailVerification(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['email', 'code']),
        ]

    def __str__(self):
        return f"{self.email} - {self.code} - {'Verified' if self.is_verified else 'Pending'}"

class UserExperience(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='experience')
    exp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    
    def __str__(self):
        return f"{self.user.username or self.user.campus_id} - Lv.{self.level} ({self.exp} EXP)"

class Badge(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    condition_type = models.CharField(max_length=50, help_text="e.g. 'review_count', 'campaign'")
    condition_value = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name

class UserBadge(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'badge')

class Campaign(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    reward_exp = models.IntegerField(default=0)
    reward_badge = models.ForeignKey(Badge, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class CampaignCheckIn(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='campaign_checkins')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'campaign')

class LineBotState(models.Model):
    line_user_id = models.CharField(max_length=100, unique=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    data = models.JSONField(default=dict, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.line_user_id} - {self.state}"

class DriftBottle(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='drift_bottles')
    movie_title = models.CharField(max_length=200, verbose_name="推薦電影")
    message = models.TextField(blank=True, null=True, verbose_name="推薦留言")
    fished_count = models.IntegerField(default=0, verbose_name="撈起次數")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.campus_id} - {self.movie_title}"

