from django.db import migrations
from django.db.models import Q, Count


def cleanup_duplicate_rapid_ratings(apps, schema_editor):
    Review = apps.get_model('api', 'Review')
    rapid_q = (
        Q(tags__name='急速評星') |
        Q(content='來自急速評星的無內文評價') |
        Q(content='') |
        Q(content__isnull=True)
    )

    dups = (
        Review.objects.filter(is_deleted=False)
        .filter(rapid_q)
        .values('user_id', 'movie_id')
        .annotate(c=Count('id', distinct=True))
        .filter(c__gt=1)
    )

    for d in dups:
        # 按照時間由新到舊排序，保留最新的一筆評價，將舊有重複的急速評星刪除
        reviews = list(Review.objects.filter(
            user_id=d['user_id'],
            movie_id=d['movie_id'],
            is_deleted=False
        ).filter(rapid_q).distinct().order_by('-created_at'))

        if len(reviews) > 1:
            for r_del in reviews[1:]:
                r_del.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_movie_media_type_alter_movie_director_and_more'),
    ]

    operations = [
        migrations.RunPython(cleanup_duplicate_rapid_ratings, migrations.RunPython.noop),
    ]
