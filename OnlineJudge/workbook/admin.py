from django.contrib import admin
from .models import Workbook, WorkbookProblem


@admin.register(Workbook)
class WorkbookAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'is_public', 'created_time', 'updated_time')
    list_filter = ('is_public', 'created_time')
    search_fields = ('title', 'description', 'created_by__username')
    readonly_fields = ('created_time', 'updated_time')
    ordering = ('-created_time',)


@admin.register(WorkbookProblem)
class WorkbookProblemAdmin(admin.ModelAdmin):
    list_display = ('workbook', 'problem', 'order', 'added_time')
    list_filter = ('workbook', 'added_time')
    search_fields = ('workbook__title', 'problem__title')
    readonly_fields = ('added_time',)
    ordering = ('workbook', 'order')
