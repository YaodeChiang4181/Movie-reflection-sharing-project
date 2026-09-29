from api.models import Review
print("Reviews with rating 0:", Review.objects.filter(rating=0).count())
print("Reviews with rating null:", Review.objects.filter(rating__isnull=True).count())
