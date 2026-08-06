import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import User, UserExperience
from django.db import IntegrityError
from django.db import transaction

def merge_ghost_account(ghost_campus_id, target_campus_id):
    try:
        ghost_user = User.objects.get(campus_id=ghost_campus_id)
        target_user = User.objects.get(campus_id=target_campus_id)
    except User.DoesNotExist:
        print("❌ 找不到指定的幽靈帳號或目標帳號，請確認 ID 是否正確。")
        return

    print(f"🔄 正在將幽靈帳號 [{ghost_user.username or ghost_user.campus_id}] 合併至主帳號 [{target_user.username or target_user.campus_id}]...")

    with transaction.atomic():
        # 1. 移轉心得
        reviews_count = ghost_user.reviews.update(user=target_user)
        print(f"✅ 移轉了 {reviews_count} 篇心得")

        # 2. 移轉留言
        comments_count = ghost_user.comments.update(user=target_user)
        print(f"✅ 移轉了 {comments_count} 則留言")

        # 3. 移轉揪團活動
        events_count = ghost_user.events.update(user=target_user)
        print(f"✅ 移轉了 {events_count} 個活動")

        # 4. 移轉按讚紀錄
        votes_transferred = 0
        votes_deleted = 0
        for vote in ghost_user.votes.all():
            vote.user = target_user
            try:
                vote.save()
                votes_transferred += 1
            except IntegrityError:
                vote.delete()
                votes_deleted += 1
        print(f"✅ 移轉了 {votes_transferred} 次按讚紀錄 (移除了 {votes_deleted} 筆重複的讚)")

        # 5. 合併經驗值
        if hasattr(ghost_user, 'experience'):
            target_exp, _ = UserExperience.objects.get_or_create(user=target_user)
            added_exp = ghost_user.experience.exp
            target_exp.exp += added_exp
            target_exp.level = max(1, target_exp.exp // 100)
            target_exp.save()
            print(f"✅ 合併了 {added_exp} 點經驗值，目前等級：Lv.{target_exp.level}")

        # 6. 刪除幽靈帳號
        ghost_user.delete()
        print(f"🎉 幽靈帳號已成功刪除！合併完成。")

if __name__ == "__main__":
    print("=== 幽靈帳號合併工具 ===")
    ghost_id = input("請輸入幽靈帳號的 ID (例如 ECS2JCXAZ): ").strip()
    target_id = input("請輸入您的主帳號 ID (例如 bivurrsin): ").strip()
    
    confirm = input(f"確定要將 {ghost_id} 的所有資料移轉給 {target_id} 並刪除 {ghost_id} 嗎？(y/n): ")
    if confirm.lower() == 'y':
        merge_ghost_account(ghost_id, target_id)
    else:
        print("已取消操作。")
