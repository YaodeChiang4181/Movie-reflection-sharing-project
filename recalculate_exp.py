from api.models import User, Review, Comment, Vote, UserExperience
from api.domains.gamification.services import add_user_experience

print("開始回溯計算所有使用者的經驗值...")

# 1. 歸零所有經驗值
UserExperience.objects.all().delete()
print("已將所有舊有經驗值紀錄清除歸零。")

# 2. 重新計算每位使用者應得的總經驗值
users = User.objects.all()
for user in users:
    total_exp = 0
    
    # 規則 1: 發布心得 +25
    reviews_count = Review.objects.filter(user=user, is_deleted=False).count()
    total_exp += (reviews_count * 25)
    
    # 規則 2: 留言 +10
    comments_count = Comment.objects.filter(user=user).count()
    total_exp += (comments_count * 10)
    
    # 規則 3: 獲得按讚 +1
    likes_received = Vote.objects.filter(review__user=user, vote_type=1).count()
    total_exp += (likes_received * 1)
    
    if total_exp > 0:
        # 使用現有函數，讓它自動計算等級與剩餘 EXP
        user_exp = add_user_experience(user, total_exp)
        print(f"使用者 {user.username} (學號: {user.campus_id}): 獲得 {total_exp} 點經驗值 -> 升級至 Lv.{user_exp.level}, 剩餘 EXP: {user_exp.exp}")

print("回溯計算完成！")
