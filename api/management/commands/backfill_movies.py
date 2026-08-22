import time
from django.core.management.base import BaseCommand
from api.models import Movie
from api.utils.tmdb import fetch_movie_metadata

class Command(BaseCommand):
    help = 'Backfill original_title, tmdb_id, and poster_url for existing movies'

    def handle(self, *args, **kwargs):
        movies = Movie.objects.filter(tmdb_id__isnull=True)
        total = movies.count()
        self.stdout.write(f"Found {total} movies to backfill.")
        
        updated = 0
        for i, movie in enumerate(movies, 1):
            self.stdout.write(f"Processing [{i}/{total}]: {movie.title} ...")
            tmdb_meta = fetch_movie_metadata(movie.title)
            
            if tmdb_meta:
                save_needed = False
                if tmdb_meta.get('original_title') and not movie.original_title:
                    movie.original_title = tmdb_meta['original_title']
                    save_needed = True
                if tmdb_meta.get('tmdb_id') and not movie.tmdb_id:
                    movie.tmdb_id = tmdb_meta['tmdb_id']
                    save_needed = True
                if tmdb_meta.get('poster_url') and not movie.poster_url:
                    movie.poster_url = tmdb_meta['poster_url']
                    save_needed = True
                
                if save_needed:
                    movie.save()
                    updated += 1
                    self.stdout.write(self.style.SUCCESS(f"  -> Updated: {movie.original_title}"))
                else:
                    self.stdout.write("  -> Already up to date or missing data.")
            else:
                self.stdout.write(self.style.WARNING("  -> No TMDB data found."))
                
            # Sleep slightly to avoid hitting API limits
            time.sleep(0.3)
            
        self.stdout.write(self.style.SUCCESS(f"Backfill complete! Updated {updated} out of {total} movies."))
