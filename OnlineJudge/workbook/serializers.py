from rest_framework import serializers
from .models import Workbook, WorkbookProblem
from problem.serializers import ProblemSerializer
from account.serializers import UserSerializer


class WorkbookSerializer(serializers.ModelSerializer):
    """문제집 시리얼라이저"""
    created_by = UserSerializer(read_only=True)
    problem_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Workbook
        fields = [
            'id', 'title', 'description', 'created_by', 
            'created_at', 'updated_at', 'is_public', 'problem_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_problem_count(self, obj):
        return obj.problems.count()


class WorkbookProblemSerializer(serializers.ModelSerializer):
    """문제집 문제 시리얼라이저"""
    problem = ProblemSerializer(read_only=True)
    
    class Meta:
        model = WorkbookProblem
        fields = ['id', 'problem', 'order', 'added_time']
        read_only_fields = ['id', 'added_time']


class WorkbookDetailSerializer(WorkbookSerializer):
    """문제집 상세 시리얼라이저 (문제 목록 포함)"""
    problems = WorkbookProblemSerializer(many=True, read_only=True)
    
    class Meta(WorkbookSerializer.Meta):
        fields = WorkbookSerializer.Meta.fields + ['problems']
