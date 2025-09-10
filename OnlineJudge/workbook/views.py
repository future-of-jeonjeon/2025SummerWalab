from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from utils.api import APIView
from .models import Workbook, WorkbookProblem
from .serializers import WorkbookSerializer, WorkbookDetailSerializer, WorkbookProblemSerializer


class WorkbookPagination(PageNumberPagination):
    """문제집 페이지네이션"""
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100


class WorkbookListCreateView(APIView):
    """문제집 목록 조회 및 생성"""
    
    def get(self, request):
        """문제집 목록 조회"""
        queryset = Workbook.objects.filter(is_public=True)
        
        # 검색 필터
        search = request.GET.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )
        
        # 정렬
        queryset = queryset.order_by('-created_at')
        
        # 페이지네이션
        data = self.paginate_data(request, queryset, WorkbookSerializer)
        return self.success(data)


class WorkbookDetailView(APIView):
    """문제집 상세 조회"""
    
    def get(self, request, pk):
        """문제집 상세 조회"""
        try:
            workbook = Workbook.objects.get(id=pk, is_public=True)
            serializer = WorkbookDetailSerializer(workbook)
            return self.success(serializer.data)
        except Workbook.DoesNotExist:
            return self.error("문제집을 찾을 수 없습니다.")


class WorkbookProblemsView(APIView):
    """문제집의 문제 목록 조회"""
    
    def get(self, request, workbook_id):
        """문제집의 문제 목록 조회"""
        try:
            workbook = Workbook.objects.get(id=workbook_id, is_public=True)
            problems = workbook.problems.all().order_by('order', 'added_time')
            serializer = WorkbookProblemSerializer(problems, many=True)
            return self.success({
                'data': serializer.data,
                'workbook': WorkbookSerializer(workbook).data
            })
        except Workbook.DoesNotExist:
            return self.error("문제집을 찾을 수 없습니다.")
