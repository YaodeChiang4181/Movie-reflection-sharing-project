import os
import django
from django.db import transaction

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import UserIdentity, UserProfile

User = get_user_model()

def create_super_admin():
    campus_id = '113409016'
    password = 'Tyzz4181'
    
    with transaction.atomic():
        if User.objects.filter(campus_id=campus_id).exists():
            user = User.objects.get(campus_id=campus_id)
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            print(f"Admin {campus_id} updated successfully.")
        else:
            user = User(
                campus_id=campus_id,
                username=campus_id,
                is_staff=True,
                is_superuser=True
            )
            user.set_password(password)
            user.save()
            
            UserIdentity.objects.create(
                user=user, 
                real_name="系統管理員", 
                department="管理員", 
                school_email=f"admin_{campus_id}@cc.ncu.edu.tw"
            )
            UserProfile.objects.create(
                user=user, 
                nickname="Admin"
            )
            print(f"Admin {campus_id} created successfully.")

if __name__ == '__main__':
    create_super_admin()
