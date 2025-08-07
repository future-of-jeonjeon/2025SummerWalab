from django.conf.urls import url
from .views import WorkbookAPI

urlpatterns = [
    url(r'^workbook$', WorkbookAPI.as_view(), name='workbook_api'),
] 