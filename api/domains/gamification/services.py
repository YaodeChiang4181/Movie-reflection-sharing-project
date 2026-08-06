from api.models import UserExperience

def add_user_experience(user, exp_gained=25):
    """
    增加使用者的經驗值並計算等級。
    每級升級所需經驗值 = 目前等級 * 100
    升級後，目前經驗值會扣除升級所需花費。
    """
    user_exp, _ = UserExperience.objects.get_or_create(user=user)
    
    # 確保初始等級為 1
    if user_exp.level < 1:
        user_exp.level = 1
        
    user_exp.exp += exp_gained
    
    # 判斷是否升級
    while True:
        level_up_cost = user_exp.level * 100
        if user_exp.exp >= level_up_cost:
            user_exp.exp -= level_up_cost
            user_exp.level += 1
        else:
            break
            
    user_exp.save()
    return user_exp
