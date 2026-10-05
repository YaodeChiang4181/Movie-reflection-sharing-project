from django.db import migrations

def promote_jlsrqytgp(apps, schema_editor):
    User = apps.get_model('api', 'User')
    try:
        user = User.objects.get(campus_id='jlsrqytgp')
        user.is_staff = True
        user.is_superuser = True
        user.save()
    except User.DoesNotExist:
        pass

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0029_authcode'),
    ]

    operations = [
        migrations.RunPython(promote_jlsrqytgp),
    ]
