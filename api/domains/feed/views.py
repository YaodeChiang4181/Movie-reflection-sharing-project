from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Max, Q, Count, Avg
from django.utils import timezone
from api.models import Movie, Event
from api.domains.reviews.serializers import MovieSerializer
from api.domains.events.serializers import EventSerializer
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class FeedView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        feed_type = request.query_params.get('type', 'all')
        
        items = []

        if feed_type in ['all', 'movies']:
            # Fetch movies annotated with review stats and latest review time
            movies = Movie.objects.annotate(
                avg_rating=Avg('reviews__rating', filter=Q(reviews__is_deleted=False)),
                review_count=Count('reviews', filter=Q(reviews__is_deleted=False)),
                latest_review_time=Max('reviews__created_at', filter=Q(reviews__is_deleted=False))
            ).filter(review_count__gt=0)
            
            if feed_type == 'movies':
                # For movies only, sort by popularity
                movies = movies.annotate(
                    normal_review_count=Count('reviews', filter=Q(reviews__is_deleted=False) & ~Q(reviews__content=""))
                ).order_by('-normal_review_count', '-review_count', '-id')[:100]
            else:
                movies = movies.order_by('-latest_review_time')[:100]
                
            for m in movies:
                data = MovieSerializer(m).data
                data['feed_type'] = 'MOVIE'
                # Ensure we have a valid sort_time for mixing
                data['sort_time'] = m.latest_review_time.isoformat() if m.latest_review_time else '1970-01-01T00:00:00Z'
                items.append(data)
                
        if feed_type in ['all', 'events']:
            # Only fetch FINISHED events for the feed
            events = Event.objects.filter(end_time__lt=timezone.now()).order_by('-end_time')[:100]
            for e in events:
                data = EventSerializer(e, context={'request': request}).data
                data['feed_type'] = 'EVENT'
                # Use end_time or start_time for sorting
                sort_time = e.end_time or e.start_time
                data['sort_time'] = sort_time.isoformat() if sort_time else '1970-01-01T00:00:00Z'
                items.append(data)
                
        # Sort combined items by sort_time descending if all
        if feed_type == 'all':
            items.sort(key=lambda x: x['sort_time'], reverse=True)
        
        # Paginate
        paginator = FeedPagination()
        paginated_items = paginator.paginate_queryset(items, request, view=self)
        
        return paginator.get_paginated_response(paginated_items)
