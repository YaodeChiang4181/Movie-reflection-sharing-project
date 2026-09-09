import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.test import RequestFactory
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers

class TestSerializer(serializers.Serializer):
    is_auth = serializers.SerializerMethodField()
    def get_is_auth(self, obj):
        request = self.context.get('request')
        return request.user.is_authenticated if request else False

class TestView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response(TestSerializer({}, context={'request': request}).data)

request = RequestFactory().get('/test', HTTP_AUTHORIZATION='Bearer invalid_token_here')
view = TestView.as_view()
try:
    response = view(request)
    response.render()
    print("Status:", response.status_code)
    print("Content:", response.content)
except Exception as e:
    print("Exception:", type(e), e)
