from django.db import models
from utils.models import JSONField, RichTextField
from account.models import User
from problem.models import Problem


class Workbook(models.Model):
    """문제집 모델"""
    title = models.CharField(max_length=200, verbose_name="제목")
    description = RichTextField(verbose_name="설명")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="생성자")
    created_time = models.DateTimeField(auto_now_add=True, verbose_name="생성 시간")
    updated_time = models.DateTimeField(auto_now=True, verbose_name="수정 시간")
    is_public = models.BooleanField(default=False, verbose_name="공개 여부")
    
    class Meta:
        db_table = "workbook"
        verbose_name = "문제집"
        verbose_name_plural = "문제집들"
        ordering = ("-created_time",)
    
    def __str__(self):
        return self.title


class WorkbookProblem(models.Model):
    """문제집에 포함된 문제 모델"""
    workbook = models.ForeignKey(Workbook, on_delete=models.CASCADE, related_name="problems", verbose_name="워크북")
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, verbose_name="문제")
    order = models.PositiveIntegerField(default=0, verbose_name="순서")
    added_time = models.DateTimeField(auto_now_add=True, verbose_name="추가 시간")
    
    class Meta:
        db_table = "workbook_problem"
        verbose_name = "문제집 문제"
        verbose_name_plural = "문제집 문제들"
        ordering = ("order", "added_time")
        unique_together = (("workbook", "problem"),)
    
    def __str__(self):
        return f"{self.workbook.title} - {self.problem.title}"
