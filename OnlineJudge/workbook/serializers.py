from rest_framework import serializers
from .models import Workbook


class WorkbookSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    
    class Meta:
        model = Workbook
        fields = [
            'id', 'title', 'description', 'category', 
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None
    
    def create(self, validated_data):
        # created_by_id를 직접 설정
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by_id'] = request.user.id
        return super().create(validated_data) 