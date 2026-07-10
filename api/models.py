from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Using Django's AbstractUser which already has: username, password, email, first_name, last_name, date_joined
    
    def __str__(self):
        return self.username

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    nickname = models.CharField(max_length=50, blank=True)
    
    def __str__(self):
        return self.nickname or self.user.username

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
