"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import HttpResponse
from django.core.management import call_command

def health_check(request):
    return HttpResponse("OK")

def trigger_backfill(request):
    try:
        call_command('backfill_movies')
        return HttpResponse("Backfill complete! 英文片名已補齊，可以關閉此網頁並回去測試搜尋了。")
    except Exception as e:
        return HttpResponse(f"Error: {e}")

urlpatterns = [
    path('', health_check, name='health_check'),
    path('backfill/', trigger_backfill, name='trigger_backfill'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
