import os
import requests
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
                user_nickname = getattr(user, 'profile', None) and user.profile.nickname or user.username or user.campus_id
                
                html_events = ""
                plain_events = ""
                first_event_title = ""
                first_host_name = ""
                
                if events_count > 0:
                    for ev in new_events[:3]:
                        host_name = getattr(ev.user, 'profile', None) and ev.user.profile.nickname or ev.user.campus_id
                        event_time_str = ev.event_time.strftime("%Y-%m-%d %H:%M") if ev.event_time else "未定"
                        
                        if not first_event_title:
                            first_event_title = ev.title
                            first_host_name = host_name
                            
                        plain_events += f"  - {ev.title} (主辦：{host_name})\n"
                        html_events += f"""
        <!-- Event Mini Card -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <span style="display: inline-block; background: rgba(108, 92, 231, 0.2); color: #a78bfa; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-bottom: 8px;">🎟️ 關注主辦發起專場</span>
          <h2 style="font-size: 16px; color: #ffffff; margin: 0 0 8px 0;">{ev.title}</h2>
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px 0;">👑 主辦人：{host_name}</p>
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 16px 0;">🗓️ 時間：{event_time_str}</p>
          
          <a href="{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/events/{ev.id}" style="display: block; text-align: center; background: #6C5CE7; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 16px; border-radius: 8px;">
            查看活動詳情並報名 →
          </a>
        </div>
"""

                html_dms = ""
                plain_dms = ""
                if unread_count > 0:
                    html_dms += f"""
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <span style="display: inline-block; background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-bottom: 8px;">💬 未讀私訊 ({unread_count} 則)</span>
"""
                    for dm in unreads[:3]:
                        sender_name = getattr(dm.sender, 'profile', None) and dm.sender.profile.nickname or dm.sender.campus_id
                        plain_dms += f"  - {sender_name}: {dm.content[:40]}...\n"
                        html_dms += f"""
          <div style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
            <p style="font-size: 13px; color: #e2e8f0; margin: 0 0 4px 0;"><strong>{sender_name}</strong>：</p>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">{dm.content[:40]}{'...' if len(dm.content) > 40 else ''}</p>
          </div>
"""
                    html_dms += f"""
          <a href="{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/messages" style="display: block; text-align: center; background: rgba(255,255,255,0.1); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 16px; border-radius: 8px; margin-top: 12px;">
            前往收件匣回覆 →
          </a>
        </div>
"""
                
                # Dynamic Subject
                if events_count > 0:
                    subject = f"🎬 今晚放映快訊：{first_host_name} 發起了新活動「{first_event_title}」"
                else:
                    subject = "🎬 映後時光 · 您的今日影迷動態結算"
                
                # Plain text body fallback
                body = f"Hi {user_nickname}，今天有新的社群動態！\n\n"
                if plain_dms:
                    body += f"💬 您有 {unread_count} 則未讀私訊：\n{plain_dms}\n"
                if plain_events:
                    body += f"🎬 您追蹤的對象有 {events_count} 個新活動：\n{plain_events}\n"
                body += "請登入系統查看完整內容！\n"
                
                # HTML body
                html_body = f"""
    <div style="background-color: #0f1219; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px 16px; min-height: 100%;">
      <div style="max-width: 520px; margin: 0 auto; background: #131722; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; padding: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
        
        <!-- Header -->
        <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="font-size: 16px; color: #c4b5fd; margin: 0; font-weight: 700; letter-spacing: 0.5px;">🎬 映後時光 · 影迷日報</h1>
        </div>

        <!-- Greeting -->
        <p style="font-size: 14px; color: #e2e8f0; margin: 0 0 16px 0;">
          Hi <b>{user_nickname}</b>，今天有新的社群動態！
        </p>

        {html_events}
        {html_dms}

        <!-- Footer -->
        <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
          若不想收到每日結算信，可隨時前往平台個人設定關閉通知。
        </p>
      </div>
    </div>
"""
                
                try:
                    gas_url = os.environ.get('GAS_EMAIL_URL')
                    if gas_url:
                        response = requests.post(gas_url, json={
                            'email': user.email,
                            'subject': subject,
                            'body': body,
                            'htmlBody': html_body
                        })
                        if response.status_code != 200:
                            raise Exception('GAS 回傳錯誤')
                    else:
                        send_mail(
                            subject,
                            body,
                            settings.DEFAULT_FROM_EMAIL,
                            [user.email],
                            html_message=html_body,
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
