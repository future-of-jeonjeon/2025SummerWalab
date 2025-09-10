from django.urls import path
from . import views

urlpatterns = [
    path('', views.WorkbookListCreateView.as_view(), name='workbook-list'),
    path('<int:pk>/', views.WorkbookDetailView.as_view(), name='workbook-detail'),
    path('<int:workbook_id>/problems/', views.WorkbookProblemsView.as_view(), name='workbook-problems'),
]
