import csv
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from api.models import Event, EventRegistration, EventComment
import re
from api.domains.gamification.services import add_user_experience
from .serializers import EventSerializer, EventRegistrationSerializer, EventCommentSerializer

def extract_and_notify_mentions(comment, event, request_user):
    from api.models import Notification
    content = comment.content
    mentioned_nicknames = re.findall(r'@([^\s]+)', content)
    if not mentioned_nicknames:
        return
        
    attendees = event.registrations.filter(status__in=['REGISTERED', 'CHECKED_IN']).select_related('user', 'user__profile')
    
    notifications = []
    # Ensure unique users to notify
    notified_users = set()
    for reg in attendees:
        user = reg.user
        nickname = getattr(user, 'profile', None) and user.profile.nickname or user.campus_id
        if nickname in mentioned_nicknames and user != request_user and user.pk not in notified_users:
            sender_name = request_user.profile.nickname if hasattr(request_user, 'profile') else request_user.campus_id
            notifications.append(
                Notification(
                    user=user,
                    type='mention',
                    title=f"{sender_name} 在活動「{event.title}」的留言中標記了你",
                    target_url=f"/events?id={event.id}" # We'll just open the modal via id or they can view events page
                )
            )
            notified_users.add(user.pk)
            
    if notifications:
        Notification.objects.bulk_create(notifications)

class EventCommentViewSet(viewsets.ModelViewSet):
    serializer_class = EventCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return EventComment.objects.all()

    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.user != request.user and not request.user.is_staff:
            return Response({'detail': '您沒有權限編輯此留言'}, status=status.HTTP_403_FORBIDDEN)
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'detail': '留言內容不能為空'}, status=status.HTTP_400_BAD_REQUEST)
            
        comment.content = content
        comment.save()
        
        # parse mentions again on update
        extract_and_notify_mentions(comment, comment.event, request.user)
        
        return Response(EventCommentSerializer(comment).data)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.user != request.user and not request.user.is_staff:
            return Response({'detail': '您沒有權限刪除此留言'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    
    def get_queryset(self):
        queryset = Event.objects.all()
        status_param = self.request.query_params.get('status', None)
        
        now = timezone.now()
        if status_param == 'UPCOMING':
            queryset = queryset.filter(Q(end_time__gte=now) | Q(end_time__isnull=True))
            queryset = queryset.order_by('end_time', 'event_time')
        elif status_param == 'COMPLETED':
            queryset = queryset.filter(end_time__lt=now)
            queryset = queryset.order_by('-end_time', '-event_time')
        else:
            queryset = queryset.order_by('-created_at')

        return queryset.annotate(
            registered_count=Count('registrations', filter=Q(registrations__status='REGISTERED'), distinct=True),
            comment_count=Count('event_comments', distinct=True)
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            event = serializer.save(user=self.request.user)
            EventRegistration.objects.create(event=event, user=self.request.user, status='REGISTERED')
            
            # 建立活動獲得 25 EXP
            add_user_experience(self.request.user, 25)
            
            # 建立通知給追蹤者
            from api.models import Follow, Notification
            followers = Follow.objects.filter(following=self.request.user).select_related('follower')
            notifications = []
            
            sender_name = getattr(self.request.user, 'profile', None) and self.request.user.profile.nickname or self.request.user.campus_id
            for follow in followers:
                notifications.append(
                    Notification(
                        user=follow.follower,
                        type='new_event',
                        title=f"{sender_name} 發起了新活動: {event.title}",
                        target_url=f"/events/{event.id}"
                    )
                )
            if notifications:
                Notification.objects.bulk_create(notifications)

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        if event.user != request.user and not request.user.is_staff:
            return Response({"detail": "您沒有權限編輯此活動。"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)
        
    def partial_update(self, request, *args, **kwargs):
        event = self.get_object()
        if event.user != request.user and not request.user.is_staff:
            return Response({"detail": "您沒有權限編輯此活動。"}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        event = self.get_object()
        if event.user != request.user and not request.user.is_staff:
            return Response({"detail": "您沒有權限刪除此活動。"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def register(self, request, pk=None):
        user = request.user
        
        # 防範暴力破解與惡意洗 API
        from django.core.cache import cache
        cache_key = f'event_register_rate_{user.pk}_{pk}'
        attempts = cache.get(cache_key, 0)
        
        if attempts >= 10:
            return Response({'detail': '操作過於頻繁，請稍後再試'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
        cache.set(cache_key, attempts + 1, 60 * 10) # 10 分鐘內最多 10 次
        
        with transaction.atomic():
            # Support SQLite safely
            try:
                from django.db import connection
                if connection.vendor in ['postgresql', 'mysql', 'oracle']:
                    event = Event.objects.select_for_update().get(pk=pk)
                else:
                    event = Event.objects.get(pk=pk)
            except Event.DoesNotExist:
                return Response({'detail': '活動不存在'}, status=status.HTTP_404_NOT_FOUND)

            if event.end_time and timezone.now() > event.end_time:
                return Response({'detail': '活動已結束'}, status=status.HTTP_400_BAD_REQUEST)
                
            current_registrations = event.registrations.filter(status='REGISTERED').count()
            
            reg = EventRegistration.objects.filter(event=event, user=user).first()
            if reg and reg.status == 'REGISTERED':
                return Response({'detail': '您已經報名過了'}, status=status.HTTP_400_BAD_REQUEST)

            if event.capacity > 0 and current_registrations >= event.capacity:
                return Response({'detail': '名額已滿'}, status=status.HTTP_400_BAD_REQUEST)

            if reg:
                if reg.status == 'CANCELLED':
                    reg.status = 'REGISTERED'
                    reg.save()
            else:
                EventRegistration.objects.create(event=event, user=user, status='REGISTERED')
            
        return Response({'detail': '報名成功'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def comments(self, request, pk=None):
        event = self.get_object()
        user = request.user
        content = request.data.get('content', '').strip()
        
        if not content:
            return Response({'detail': '留言內容不能為空'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine user_tag dynamically
        user_tag = '敲碗下次'
        if user == event.user:
            user_tag = '主辦方'
        elif event.registrations.filter(user=user, status='REGISTERED').exists():
            user_tag = '現場觀眾'

        comment = EventComment.objects.create(
            event=event, user=user, content=content, user_tag=user_tag
        )
        
        # Grant EXP for leaving an event comment
        add_user_experience(user, 10)
        
        extract_and_notify_mentions(comment, event, user)
        
        serializer = EventCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticatedOrReadOnly])
    def list_comments(self, request, pk=None):
        event = self.get_object()
        comments = event.event_comments.all().order_by('-created_at')
        serializer = EventCommentSerializer(comments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def checkin(self, request, pk=None):
        user = request.user
        
        with transaction.atomic():
            try:
                from django.db import connection
                if connection.vendor in ['postgresql', 'mysql', 'oracle']:
                    event = Event.objects.select_for_update().get(pk=pk)
                else:
                    event = Event.objects.get(pk=pk)
            except Event.DoesNotExist:
                return Response({'detail': '活動不存在'}, status=status.HTTP_404_NOT_FOUND)

            reg = EventRegistration.objects.filter(event=event, user=user).first()
            
            if reg:
                if reg.status == 'CHECKED_IN':
                    return Response({
                        'success': True,
                        'type': f'{reg.registration_type}_CHECKIN',
                        'checked_in_at': reg.checked_in_at,
                        'exp_awarded': 0,
                        'event': {'title': event.title, 'host_name': event.organizer_nickname}
                    }, status=status.HTTP_200_OK)
                
                # Update to CHECKED_IN
                reg.status = 'CHECKED_IN'
                reg.checked_in_at = timezone.now()
                reg.save()
                
                # Award EXP
                add_user_experience(user, 15)
                
                return Response({
                    'success': True,
                    'type': f'{reg.registration_type}_CHECKIN',
                    'checked_in_at': reg.checked_in_at,
                    'exp_awarded': 15,
                    'event': {'title': event.title, 'host_name': event.organizer_nickname}
                }, status=status.HTTP_200_OK)
            else:
                # Walk-in logic
                current_registrations = event.registrations.filter(status__in=['REGISTERED', 'CHECKED_IN']).count()
                if event.capacity > 0 and current_registrations >= event.capacity:
                    return Response({'detail': '現場名額已滿'}, status=status.HTTP_409_CONFLICT)
                
                reg = EventRegistration.objects.create(
                    event=event,
                    user=user,
                    registration_type='WALK_IN',
                    status='CHECKED_IN',
                    checked_in_at=timezone.now()
                )
                
                # Award EXP
                add_user_experience(user, 15)
                
                return Response({
                    'success': True,
                    'type': 'WALK_IN_CHECKIN',
                    'checked_in_at': reg.checked_in_at,
                    'exp_awarded': 15,
                    'event': {'title': event.title, 'host_name': event.organizer_nickname}
                }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def attendance_summary(self, request, pk=None):
        event = self.get_object()
        
        # Only the host can view
        if event.user != request.user and not request.user.is_staff:
            return Response({'detail': '權限不足'}, status=status.HTTP_403_FORBIDDEN)
            
        registrations = event.registrations.all().select_related('user', 'user__identity')
        
        total_capacity = event.capacity
        total_registered = registrations.filter(registration_type='ONLINE').count()
        total_attended = registrations.filter(status='CHECKED_IN').count()
        attendance_rate = (total_attended / total_capacity) if total_capacity > 0 else (1.0 if total_attended > 0 else 0)
        
        pre_registered_attended = registrations.filter(registration_type='ONLINE', status='CHECKED_IN').count()
        walk_in_attended = registrations.filter(registration_type='WALK_IN', status='CHECKED_IN').count()
        no_show = registrations.filter(registration_type='ONLINE', status__in=['REGISTERED', 'NO_SHOW']).count()
        
        attendee_list = []
        for reg in registrations.order_by('-checked_in_at'):
            name = reg.user.username
            department = "未知"
            if hasattr(reg.user, 'identity'):
                name = reg.user.identity.real_name
                department = reg.user.identity.department
            elif hasattr(reg.user, 'outsider_identity'):
                name = reg.user.outsider_identity.real_name
                department = reg.user.outsider_identity.occupation
                
            attendee_list.append({
                "user_id": getattr(reg.user, 'campus_id', '') or '',
                "name": name,
                "department": department,
                "type": reg.registration_type,
                "status": reg.status,
                "checked_in_at": reg.checked_in_at
            })
            
        return Response({
            "total_capacity": total_capacity,
            "total_registered": total_registered,
            "total_attended": total_attended,
            "attendance_rate": attendance_rate,
            "breakdown": {
                "pre_registered_attended": pre_registered_attended,
                "walk_in_attended": walk_in_attended,
                "no_show": no_show
            },
            "attendee_list": attendee_list
        })

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def mentionable_users(self, request, pk=None):
        event = self.get_object()
        attendees = event.registrations.filter(status__in=['REGISTERED', 'CHECKED_IN']).select_related('user', 'user__profile')
        
        users_list = []
        seen_campus_ids = set()
        
        for reg in attendees:
            campus_id = reg.user.campus_id
            if campus_id in seen_campus_ids:
                continue
                
            nickname = reg.user.profile.nickname if hasattr(reg.user, 'profile') else campus_id
            users_list.append({
                'campus_id': campus_id,
                'nickname': nickname
            })
            seen_campus_ids.add(campus_id)
            
        # also add host if not already in list
        host = event.user
        if host and host.campus_id not in seen_campus_ids:
            host_nickname = host.profile.nickname if hasattr(host, 'profile') else host.campus_id
            users_list.append({
                'campus_id': host.campus_id,
                'nickname': host_nickname
            })
            
        return Response(users_list)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_recap_images(self, request, pk=None):
        event = self.get_object()
        if event.user != request.user and not request.user.is_staff:
            return Response({"detail": "您沒有權限上傳。"}, status=status.HTTP_403_FORBIDDEN)
        
        images = request.FILES.getlist('images')
        if not images:
            return Response({"detail": "No images provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check size limit (2MB)
        for image in images:
            if image.size > 2 * 1024 * 1024:
                return Response({"detail": f"File {image.name} exceeds 2MB limit."}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.core.files.storage import default_storage
        import uuid
        import os
        
        uploaded_urls = []
        for image in images:
            ext = os.path.splitext(image.name)[1]
            filename = f"events/recaps/{event.id}_{uuid.uuid4().hex}{ext}"
            path = default_storage.save(filename, image)
            url = default_storage.url(path)
            uploaded_urls.append(url)
            
        if not isinstance(event.recap_images, list):
            event.recap_images = []
        event.recap_images.extend(uploaded_urls)
        event.save()
        
        return Response({"recap_images": event.recap_images})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def export_attendance(self, request, pk=None):
        event = self.get_object()
        
        if event.user != request.user and not request.user.is_staff:
            return Response({'detail': '權限不足'}, status=status.HTTP_403_FORBIDDEN)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance-report-{event.id}.csv"'
        response.write('\ufeff'.encode('utf8'))
        
        writer = csv.writer(response)
        writer.writerow(['學號/ID', '姓名', '院系/職業', '報名途徑', '簽到狀態', '簽到時間'])
        
        registrations = event.registrations.all().select_related('user', 'user__identity').order_by('-checked_in_at')
        for reg in registrations:
            name = reg.user.username
            department = "未知"
            if hasattr(reg.user, 'identity'):
                name = reg.user.identity.real_name
                department = reg.user.identity.department
            elif hasattr(reg.user, 'outsider_identity'):
                name = reg.user.outsider_identity.real_name
                department = reg.user.outsider_identity.occupation
                
            checked_in_time = reg.checked_in_at.strftime("%Y-%m-%d %H:%M:%S") if reg.checked_in_at else ""
            type_str = "線上預約" if reg.registration_type == "ONLINE" else "現場空降"
            status_str = "已簽到" if reg.status == "CHECKED_IN" else ("未報到" if reg.status in ["REGISTERED", "NO_SHOW"] else reg.status)
            
            writer.writerow([
                getattr(reg.user, 'campus_id', '') or '',
                name,
                department,
                type_str,
                status_str,
                checked_in_time
            ])
            
        return response
