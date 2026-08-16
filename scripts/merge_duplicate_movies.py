import os
import sys
import django
from collections import defaultdict

# Add root directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
# Set django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie, Review
from api.utils.text_utils import normalize_movie_title
from django.db import transaction

def run():
    print("Fetching all movies...")
    movies = Movie.objects.all()
    
    # Group movies by normalized title
    groups = defaultdict(list)
    for movie in movies:
        norm_title = normalize_movie_title(movie.title)
        groups[norm_title].append(movie)
        
    merged_count = 0
    deleted_count = 0
    
    for norm_title, movie_list in groups.items():
        if len(movie_list) <= 1:
            continue
            
        print(f"\nFound duplicates for normalized title: '{norm_title}'")
        
        # We will keep the first movie created (or the one with the exact normalized title if it exists)
        # Let's sort them by id so we keep the oldest one
        movie_list.sort(key=lambda m: m.id)
        
        # Attempt to find if any of them exactly matches the normalized title,
        # otherwise just use the oldest one.
        primary_movie = None
        for m in movie_list:
            if m.title == norm_title:
                primary_movie = m
                break
        
        if not primary_movie:
            primary_movie = movie_list[0]
            
        # Update primary movie title to the normalized one to be clean
        if primary_movie.title != norm_title:
            primary_movie.title = norm_title
            primary_movie.save()
            print(f"  -> Renamed primary movie ID {primary_movie.id} to '{norm_title}'")
            
        # Merge all other movies into primary_movie
        for duplicate_movie in movie_list:
            if duplicate_movie.id == primary_movie.id:
                continue
                
            print(f"  -> Merging movie '{duplicate_movie.title}' (ID {duplicate_movie.id}) into ID {primary_movie.id}")
            
            # Transfer all reviews
            reviews = Review.objects.filter(movie=duplicate_movie)
            transferred_reviews = reviews.count()
            if transferred_reviews > 0:
                with transaction.atomic():
                    reviews.update(movie=primary_movie)
                print(f"     * Transferred {transferred_reviews} reviews")
            
            # Delete the duplicate movie
            duplicate_movie.delete()
            print(f"     * Deleted duplicate movie ID {duplicate_movie.id}")
            
            merged_count += transferred_reviews
            deleted_count += 1
            
    print("\n--- Summary ---")
    print(f"Total reviews transferred: {merged_count}")
    print(f"Total duplicate movies deleted: {deleted_count}")

if __name__ == '__main__':
    run()
