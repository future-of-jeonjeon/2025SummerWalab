from rest_framework import status
from rest_framework.response import Response
from django.db.models import Q
from django.http import JsonResponse
from utils.api import APIView
from workbook.models import Workbook
from workbook.serializers import WorkbookSerializer


class WorkbookAPI(APIView):
    http_method_names = ['get', 'post', 'put', 'delete']
    def get(self, request):
        """
        문제집 목록 조회 또는 특정 문제집 조회
        """
        workbook_id = request.GET.get('id')
        
        if workbook_id:
            # 특정 문제집 조회
            try:
                workbook = Workbook.objects.get(id=workbook_id)
                serializer = WorkbookSerializer(workbook, context={'request': request})
                return JsonResponse({
                    'error': None,
                    'data': serializer.data
                })
            except Workbook.DoesNotExist:
                return JsonResponse({
                    'error': 'error',
                    'data': 'Workbook not found'
                }, status=404)
        else:
            # 문제집 목록 조회
            workbooks = Workbook.objects.all()
            
            # 검색 기능
            keyword = request.GET.get('keyword', '')
            if keyword:
                workbooks = workbooks.filter(
                    Q(title__icontains=keyword) | 
                    Q(description__icontains=keyword) | 
                    Q(category__icontains=keyword)
                )
            
            # 페이징
            offset = int(request.GET.get('offset', 0))
            limit = int(request.GET.get('limit', 10))
            total = workbooks.count()
            workbooks = workbooks[offset:offset + limit]
            
            serializer = WorkbookSerializer(workbooks, many=True, context={'request': request})
            return JsonResponse({
                'error': None,
                'data': {
                    'results': serializer.data,
                    'total': total
                }
            })



    def post(self, request):
        """
        문제집 생성
        """
        data = request.data
        print(f"DEBUG: POST request received")
        print(f"DEBUG: request.data = {request.data}")
        
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'login-required', 'data': 'Please login in first'}, status=401)
        
        # 생성
        print(f"DEBUG: request.user = {request.user}")
        print(f"DEBUG: request.user.id = {request.user.id if request.user.is_authenticated else 'Not authenticated'}")
        
        try:
            workbook = Workbook.objects.create(
                title=data.get('title'),
                description=data.get('description'),
                category=data.get('category'),
                created_by_id=request.user.id
            )
            serializer = WorkbookSerializer(workbook, context={'request': request})
            return JsonResponse({
                'error': None,
                'data': serializer.data
            }, status=201)
        except Exception as e:
            print(f"DEBUG: Error creating workbook: {e}")
            return JsonResponse({
                'error': 'error',
                'data': str(e)
            }, status=400)

    def put(self, request):
        """
        문제집 수정
        """
        data = request.data
        print(f"DEBUG: PUT request received")
        print(f"DEBUG: request.data = {request.data}")
        
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'login-required', 'data': 'Please login in first'}, status=401)
        
        # 수정
        workbook_id = data.get('id')
        if not workbook_id:
            return JsonResponse({
                'error': 'error',
                'data': 'Workbook ID is required'
            }, status=400)
        
        try:
            workbook = Workbook.objects.get(id=workbook_id)
            workbook.title = data.get('title', workbook.title)
            workbook.description = data.get('description', workbook.description)
            workbook.category = data.get('category', workbook.category)
            workbook.save()
            
            serializer = WorkbookSerializer(workbook, context={'request': request})
            return JsonResponse({
                'error': None,
                'data': serializer.data
            })
        except Workbook.DoesNotExist:
            return JsonResponse({
                'error': 'error',
                'data': 'Workbook not found'
            }, status=404)
        except Exception as e:
            print(f"DEBUG: Error updating workbook: {e}")
            return JsonResponse({
                'error': 'error',
                'data': str(e)
            }, status=400)

    def delete(self, request):
        """
        문제집 삭제
        """
        workbook_id = request.GET.get('id')
        try:
            workbook = Workbook.objects.get(id=workbook_id)
            workbook.delete()
            return JsonResponse({
                'error': None,
                'data': 'Workbook deleted successfully'
            })
        except Workbook.DoesNotExist:
            return JsonResponse({
                'error': 'error',
                'data': 'Workbook not found'
            }, status=404) 