import random
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from api.models import DriftBottle
from .serializers import DriftBottleSerializer

class DriftBottleViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DriftBottleSerializer

    def create(self, request, *args, **kwargs):
        """丟瓶子（新增推薦）"""
        movie_title = request.data.get('movie_title', '').strip()
        message = request.data.get('message', '').strip()

        if not movie_title:
            return Response({'error': '電影名稱不可為空'}, status=status.HTTP_400_BAD_REQUEST)

        bottle = DriftBottle.objects.create(
            user=request.user,
            movie_title=movie_title,
            message=message
        )
        
        # 不回傳 serializer data，只需回傳成功訊息
        return Response({'message': '成功丟出漂流瓶！'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def pick(self, request):
        """撈瓶子（隨機取得他人推薦）"""
        user = request.user
        total_bottles = DriftBottle.objects.count()
        bottles_query = DriftBottle.objects.exclude(user=user)
        
        bottles = list(bottles_query)
        if not bottles:
            if total_bottles > 0:
                return Response({'error': '目前海裡只有你丟的漂流瓶哦～等待其他人丟瓶子吧！'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': '目前海裡還沒有漂流瓶哦～趕快來當第一個丟瓶子的人吧！'}, status=status.HTTP_404_NOT_FOUND)
                
        bottle = random.choice(bottles)
        
        with transaction.atomic():
            bottle.fished_count += 1
            if total_bottles > 30 and bottle.fished_count >= 5:
                bottle.delete()
                # 就算刪除了，我們還是可以回傳這次撈到的內容
            else:
                bottle.save(update_fields=['fished_count'])
                
        serializer = self.get_serializer(bottle)
        return Response(serializer.data)
