import logging
from axes.signals import user_locked_out
from django.dispatch import receiver
from api.models import User

logger = logging.getLogger(__name__)

@receiver(user_locked_out)
def permanent_lock_on_multiple_failures(sender, request, username, ip_address, **kwargs):
    try:
        from axes.models import AccessAttempt
        # Get the attempt record
        attempt = AccessAttempt.objects.filter(username=username, ip_address=ip_address).first()
        if attempt:
            logger.info(f"User {username} locked out. Current failures: {attempt.failures_since_start}")
            # If failures reach 15 (3rd lockout, since 5 failures = 1 lockout)
            if attempt.failures_since_start >= 15:
                user = User.objects.filter(campus_id=username).first()
                if user:
                    user.is_active = False
                    user.save()
                    logger.warning(f"User {username} permanently locked out due to 15 continuous failed attempts.")
    except Exception as e:
        logger.error(f"Error in permanent_lock_on_multiple_failures: {e}")
