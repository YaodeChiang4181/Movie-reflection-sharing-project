import json
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from api.models import User, DailyDigestLog, DirectMessage, Event, Follow

class Command(BaseCommand):
    help = 'Aggregates unread messages and new events, and sends a daily digest via Email or logs as in-app.'

    def handle(self, *args, **options):
        self.stdout.write("Starting ORM based daily digest aggregation...")
        
        yesterday = timezone.now() - timedelta(hours=24)
        users = User.objects.filter(daily_digest_enabled=True)
        sent_count = 0
        
        for user in users:
            # Check if already sent today
            if DailyDigestLog.objects.filter(user=user, digest_date=timezone.now().date()).exists():
                continue
                
            # Get unread DMs
            unreads = DirectMessage.objects.filter(
                receiver=user, 
                is_read=False, 
                created_at__gte=yesterday
            ).select_related('sender')
            
            unread_count = unreads.count()
            
            # Get new events from followed users
            followed_users = Follow.objects.filter(follower=user).values_list('following', flat=True)
            new_events = Event.objects.filter(
                user__in=followed_users,
                created_at__gte=yesterday
            )
            
            events_count = new_events.count()
            
            if unread_count == 0 and events_count == 0:
                continue
                
            # Channel Routing
            if user.email_verified and user.email:
                # Send Email
                subject = "【映後時光】您的影迷日報 Daily Digest"
                
                body = f"Hi {user.username or user.campus_id},\n\n您有新的影迷動態！\n\n"
                if unread_count > 0:
                    body += f"💬 您有 {unread_count} 則未讀私訊：\n"
                    for dm in unreads[:3]:
                        body += f"  - {dm.sender.username or dm.sender.campus_id}: {dm.content[:40]}...\n"
                    body += "\n"
                    
                if events_count > 0:
                    body += f"🎬 您追蹤的對象有 {events_count} 個新活動：\n"
                    for ev in new_events[:3]:
                        body += f"  - {ev.title}\n"
                    body += "\n"
                    
                body += "請登入系統查看完整內容！\n"
                
                try:
                    import os, requests
                    gas_url = os.environ.get('GAS_EMAIL_URL')
                    if gas_url:
                        response = requests.post(gas_url, json={
                            'email': user.email,
                            'subject': subject,
                            'body': body
                        })
                        if response.status_code != 200:
                            raise Exception('GAS 回傳錯誤')
                    else:
                        send_mail(
                            subject,
                            body,
                            settings.DEFAULT_FROM_EMAIL,
                            [user.email],
                            fail_silently=False,
                        )
                    DailyDigestLog.objects.create(
                        user=user,
                        unread_messages_count=unread_count,
                        new_events_count=events_count,
                        delivery_channel='EMAIL',
                        delivery_status='SUCCESS'
                    )
                    sent_count += 1
                except Exception as e:
                    self.stderr.write(f"Failed to send email to {user.email}: {e}")
                    DailyDigestLog.objects.create(
                        user=user,
                        unread_messages_count=unread_count,
                        new_events_count=events_count,
                        delivery_channel='EMAIL',
                        delivery_status='FAILED',
                        error_message=str(e)
                    )
            elif user.line_user_id:
                # LINE only, no email - Log as IN_APP_ONLY
                DailyDigestLog.objects.create(
                    user=user,
                    unread_messages_count=unread_count,
                    new_events_count=events_count,
                    delivery_channel='IN_APP_ONLY',
                    delivery_status='SUCCESS'
                )
                sent_count += 1
            else:
                # No channel available
                DailyDigestLog.objects.create(
                    user=user,
                    unread_messages_count=unread_count,
                    new_events_count=events_count,
                    delivery_channel='SKIPPED',
                    delivery_status='SUCCESS'
                )
                
        self.stdout.write(self.style.SUCCESS(f'Successfully processed daily digests. Sent/Logged: {sent_count}'))
