from django.urls import path
from .views import MovieListViewSet

urlpatterns = [
    # 片單 CRUD
    path('', MovieListViewSet.as_view({'get': 'list', 'post': 'create'}), name='lists'),
    path('search/', MovieListViewSet.as_view({'get': 'search'}), name='lists_search'),
    path('mine/', MovieListViewSet.as_view({'get': 'mine'}), name='lists_mine'),
    path('bookmarked/', MovieListViewSet.as_view({'get': 'bookmarked'}), name='lists_bookmarked'),
    path('by-movie/<int:movie_id>/', MovieListViewSet.as_view({'get': 'by_movie'}), name='lists_by_movie'),
    path('<uuid:pk>/', MovieListViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='list_detail'),
    path('<uuid:pk>/bookmark/', MovieListViewSet.as_view({'post': 'bookmark'}), name='list_bookmark'),
]
