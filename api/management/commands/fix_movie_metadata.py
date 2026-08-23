from django.core.management.base import BaseCommand
from api.models import Movie
from api.utils.tmdb import fetch_movie_metadata

class Command(BaseCommand):
    help = 'Fixes incorrect TMDB metadata (like original_title) for existing movies by re-fetching them using exact-match logic.'

    def handle(self, *args, **kwargs):
        movies = Movie.objects.all()
        updated_count = 0
        
        for movie in movies:
            self.stdout.write(f"Checking movie: {movie.title} (Current original_title: {movie.original_title})")
            
            # Fetch metadata using the updated exact-match logic
            meta = fetch_movie_metadata(movie.title)
            if meta:
                needs_update = False
                if movie.original_title != meta.get('original_title'):
                    self.stdout.write(self.style.WARNING(f"  -> Updating original_title from '{movie.original_title}' to '{meta.get('original_title')}'"))
                    movie.original_title = meta.get('original_title')
                    needs_update = True
                
                if movie.poster_url != meta.get('poster_url'):
                    self.stdout.write(self.style.WARNING(f"  -> Updating poster_url from '{movie.poster_url}' to '{meta.get('poster_url')}'"))
                    movie.poster_url = meta.get('poster_url')
                    needs_update = True

                if needs_update:
                    movie.save()
                    updated_count += 1
                    self.stdout.write(self.style.SUCCESS("  -> Saved."))
            else:
                self.stdout.write(self.style.ERROR(f"  -> No TMDB metadata found for {movie.title}."))

        self.stdout.write(self.style.SUCCESS(f"Done. Updated {updated_count} movies."))
