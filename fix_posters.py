import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie
from api.utils.tmdb import fetch_movie_metadata

def run():
    movies = Movie.objects.all()
    count = 0
    for m in movies:
        meta = fetch_movie_metadata(m.title)
        if meta and meta.get('poster_url'):
            if m.poster_url != meta['poster_url']:
                print(f"Updating poster for {m.title}")
                m.poster_url = meta['poster_url']
                if meta.get('original_title'):
                    m.original_title = meta['original_title']
                if meta.get('tmdb_id'):
                    m.tmdb_id = meta['tmdb_id']
                m.save()
                count += 1
    print(f"Updated {count} movies.")

if __name__ == '__main__':
    run()
