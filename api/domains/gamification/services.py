from api.models import UserExperience

def add_user_experience(user, exp_gained=25):
    """
    增加使用者的經驗值並計算等級。
    每 100 EXP 升一級。
    """
    user_exp, _ = UserExperience.objects.get_or_create(user=user)
    user_exp.exp += exp_gained
    user_exp.level = (user_exp.exp // 100) + 1
    user_exp.save()
    return user_exp
