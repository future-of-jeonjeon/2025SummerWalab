# Generated manually for workbook app

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('account', '0001_initial'),
        ('problem', '0014_problem_share_submission'),
    ]

    operations = [
        migrations.CreateModel(
            name='Workbook',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='제목')),
                ('description', models.TextField(verbose_name='설명')),
                ('created_time', models.DateTimeField(auto_now_add=True, verbose_name='생성 시간')),
                ('updated_time', models.DateTimeField(auto_now=True, verbose_name='수정 시간')),
                ('is_public', models.BooleanField(default=False, verbose_name='공개 여부')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='account.user', verbose_name='생성자')),
            ],
            options={
                'verbose_name': '문제집',
                'verbose_name_plural': '문제집들',
                'db_table': 'workbook',
                'ordering': ('-created_time',),
            },
        ),
        migrations.CreateModel(
            name='WorkbookProblem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='순서')),
                ('added_time', models.DateTimeField(auto_now_add=True, verbose_name='추가 시간')),
                ('problem', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='problem.problem', verbose_name='문제')),
                ('workbook', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='problems', to='workbook.workbook', verbose_name='문제집')),
            ],
            options={
                'verbose_name': '문제집 문제',
                'verbose_name_plural': '문제집 문제들',
                'db_table': 'workbook_problem',
                'ordering': ('order', 'added_time'),
                'unique_together': {('workbook', 'problem')},
            },
        ),
    ]
