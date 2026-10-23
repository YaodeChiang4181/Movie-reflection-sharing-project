import os
import requests
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from api.models import UserIdentity, OutsiderIdentity, UserProfile

User = get_user_model()


def mask_email(email: str) -> str:
    """
    將電子郵件遮罩以保護個資
    例如: 111502501@cc.ncu.edu.tw -> 11150****@cc.ncu.edu.tw
          john.doe@gmail.com -> joh****e@gmail.com
    """
    if not email or '@' not in email:
        return '****'
    name, domain = email.split('@', 1)
    if len(name) <= 2:
        masked_name = name[0] + '***'
    elif len(name) <= 4:
        masked_name = name[:2] + '***'
    else:
        prefix_len = min(4, len(name) - 3)
        masked_name = name[:prefix_len] + '****' + name[-1]
    return f"{masked_name}@{domain}"


def resolve_user_by_identifier(identifier: str):
    """
    智慧帳號解析器：
    根據輸入的信箱、學號/帳號ID、或公開暱稱，定位唯一使用者與其對應的通訊信箱。
    回傳字典格式：
    {
        'user': User 物件,
        'email': str | None,
        'identity_type': 'student' | 'outsider' | 'third_party' | 'general',
        'identity_label': str,
        'nickname': str,
        'campus_id': str,
        'masked_email': str | None,
        'has_usable_password': bool
    }
    若查無符合帳號則回傳 None。
    """
    if not identifier or not isinstance(identifier, str):
        return None

    raw_id = identifier.strip()
    if not raw_id:
        return None

    user = None
    target_email = None
    identity_type = 'general'
    identity_label = '映後時光使用者'

    # 1. 若輸入包含 '@'，依序搜尋各信箱資料表
    if '@' in raw_id:
        # A. 校外人士信箱
        outsider = OutsiderIdentity.objects.filter(email__iexact=raw_id).select_related('user').first()
        if outsider:
            user = outsider.user
            target_email = outsider.email
            identity_type = 'outsider'
            identity_label = f"校外影迷（姓名：{outsider.real_name}）"
        
        # B. 校內學生學校信箱
        if not user:
            student = UserIdentity.objects.filter(school_email__iexact=raw_id).select_related('user').first()
            if student:
                user = student.user
                target_email = student.school_email
                identity_type = 'student'
                identity_label = f"中央大學校內學生（學號：{student.user.campus_id}，姓名：{student.real_name}）"
        
        # C. User 模型本身的 email 欄位 (Google / NCU Portal / 綁定信箱)
        if not user:
            matched_user = User.objects.filter(email__iexact=raw_id).first()
            if matched_user:
                user = matched_user
                target_email = matched_user.email
                if user.google_user_id or user.line_user_id:
                    identity_type = 'third_party'
                    provider = 'Google' if user.google_user_id else 'LINE'
                    identity_label = f"第三方快速登入帳戶（{provider}）"
                else:
                    identity_type = 'general'
                    identity_label = "映後時光帳戶"

    # 2. 若不含 '@'，先以 campus_id (學號/帳號ID) 查找
    if not user:
        user = User.objects.filter(campus_id__iexact=raw_id).first()

    # 3. 若 campus_id 未命中，再以公開暱稱 (UserProfile.nickname) 查找
    if not user:
        profile = UserProfile.objects.filter(nickname__iexact=raw_id).select_related('user').first()
        if profile:
            user = profile.user

    # 若找到了 user，推導其最合適的聯絡信箱與身分標籤
    if user and not target_email:
        if hasattr(user, 'identity') and user.identity:
            target_email = user.identity.school_email
            identity_type = 'student'
            identity_label = f"中央大學校內學生（學號：{user.campus_id}，姓名：{user.identity.real_name}）"
        elif hasattr(user, 'outsider_identity') and user.outsider_identity:
            target_email = user.outsider_identity.email
            identity_type = 'outsider'
            identity_label = f"校外影迷（姓名：{user.outsider_identity.real_name}）"
        elif user.email:
            target_email = user.email
            if user.google_user_id or user.line_user_id:
                identity_type = 'third_party'
                provider = 'Google' if user.google_user_id else 'LINE'
                identity_label = f"第三方快速登入帳戶（{provider}）"
            else:
                identity_type = 'general'
                identity_label = "映後時光帳戶"
        else:
            target_email = None
            identity_type = 'line_no_email'
            identity_label = "LINE 快速註冊帳戶（尚未綁定電子信箱）"

    if not user:
        return None

    # 取得暱稱
    nickname = user.campus_id
    if hasattr(user, 'profile') and user.profile and user.profile.nickname:
        nickname = user.profile.nickname

    return {
        'user': user,
        'email': target_email,
        'identity_type': identity_type,
        'identity_label': identity_label,
        'nickname': nickname,
        'campus_id': user.campus_id,
        'masked_email': mask_email(target_email) if target_email else None,
        'has_usable_password': user.has_usable_password(),
    }


def send_system_email(recipient_email: str, subject: str, message_body: str) -> bool:
    """
    發送系統通知信：
    優先調用 GAS (Google Apps Script) 代理服務，失敗或未設定時降級至 Django send_mail
    """
    if not recipient_email:
        return False

    gas_url = os.environ.get('GAS_EMAIL_URL')
    if gas_url:
        try:
            resp = requests.post(gas_url, json={
                'email': recipient_email,
                'subject': subject,
                'body': message_body
            }, timeout=8)
            if resp.status_code == 200:
                return True
        except Exception as e:
            # GAS 發送失敗時降級使用本地 send_mail
            pass

    try:
        send_mail(
            subject=subject,
            message=message_body,
            from_email=None,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        return True
    except Exception:
        return False
