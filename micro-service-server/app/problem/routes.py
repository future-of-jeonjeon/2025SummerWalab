import os
import sys
import shutil
import asyncio
import tempfile
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import insert  # 다대다 관계 수동 삽입을 위함

# DB 설정 및 모델 임포트 (상대 경로 사용)
from app.config.database import get_session
from app.problem.models import Problem, ProblemTag, problem_tags_association_table  # app/problem/models.py에 저장된 SQLAlchemy 모델
from app.problem.json_problem_parser import ZIPJSONProblemParser  # 새로 만든 ZIP-JSON 파서


# --- Pydantic 스키마 정의 (API 응답용) ---
class ProblemTagSchema(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


class ProblemSchema(BaseModel):
    id: int
    _id: str
    title: str
    description: str
    time_limit: int
    memory_limit: int
    create_time: datetime
    last_update_time: datetime
    created_by_id: int
    rule_type: str
    visible: bool
    difficulty: Optional[str]
    total_score: int
    tags: List[ProblemTagSchema] = []

    class Config:
        orm_mode = True


# --- APIRouter 인스턴스 생성 ---
router = APIRouter(
    prefix="/api/problem",
    tags=["Problem Management"]
)

# --- 테스트 케이스 저장 경로 설정 ---
# 이 경로를 환경 변수에서 읽어오도록 변경합니다.
# Docker 환경에서는 볼륨 마운트 등을 통해 접근 가능해야 합니다.
TEST_CASE_BASE_PATH = os.getenv("TEST_CASE_DATA_PATH", "/app/test_cases_data")  # <--- 환경 변수에서 읽어오도록 변경!
# 기본값은 컨테이너 내부의 경로로 설정합니다.
os.makedirs(TEST_CASE_BASE_PATH, exist_ok=True)  # 경로가 없으면 생성


# --- 문제 임포트 API 엔드포인트 ---
@router.post("")
async def import_problem(
        file: UploadFile = File(..., description="ZIP file containing JSON problem definitions"),
        db: AsyncSession = Depends(get_session)
):
    """
    ZIP 파일 내의 JSON 파일들을 파싱하고, SQLAlchemy를 사용하여 데이터베이스에 문제를 저장합니다.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="유효하지 않은 파일 형식입니다. .zip 파일만 지원됩니다.")

    created_or_updated_problems = []
    temp_zip_file_path = ""  # ZIP 파일을 임시 저장할 경로

    try:
        # 1. 업로드된 ZIP 파일을 임시 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_zip_file:
            shutil.copyfileobj(file.file, temp_zip_file)
            temp_zip_file_path = temp_zip_file.name

        # 2. 새로운 ZIP-JSON 파서로 파일 내용 분석
        parser = ZIPJSONProblemParser(temp_zip_file_path, TEST_CASE_BASE_PATH)
        # 참고: parser.parse()는 블로킹 I/O를 포함하므로, 추후 성능 개선을 위해 asyncio.to_thread로 실행하는 것을 권장합니다.
        parsed_problems_data = parser.parse()

        # 3. 파싱된 데이터를 DB에 저장 (SQLAlchemy ORM 사용)
        for problem_data in parsed_problems_data:
            # 3.1. ProblemTag 처리 (Many-to-Many 관계)
            tag_objects = []
            for tag_name in problem_data.get('tags', []):
                result = await db.execute(select(ProblemTag).filter_by(name=tag_name))
                tag = result.scalar_one_or_none()
                if not tag:
                    tag = ProblemTag(name=tag_name)
                    db.add(tag)
                    await db.flush()  # ID 확보를 위해 commit 대신 flush 실행
                tag_objects.append(tag)

            # 3.2. Problem 객체 생성 또는 업데이트
            result = await db.execute(select(Problem).filter_by(_id=problem_data['_id']))
            problem_instance = result.scalar_one_or_none()

            # 'is_public'을 제외한 나머지 필드들로 딕셔너리 구성
            data_for_db_without_is_public = {
                k: v for k, v in problem_data.items()
                if k not in ['tags', 'id', 'create_time', 'last_update_time', 'is_public']
            }
            data_for_db_without_is_public['created_by_id'] = 1  # 임시 사용자 ID
            data_for_db_without_is_public['last_update_time'] = datetime.now()

            if problem_instance:
                # 기존 문제 업데이트
                for key, value in data_for_db_without_is_public.items():
                    setattr(problem_instance, key, value)
                problem_instance.is_public = problem_data.get('is_public', False)
            else:
                # 새 문제 생성
                data_for_db_without_is_public['create_time'] = datetime.now()
                problem_instance = Problem(**data_for_db_without_is_public)
                db.add(problem_instance)

            await db.flush()  # Problem의 ID 확보를 위해 flush 실행

            # --- 3.3. Many-to-Many 관계 수동 처리 (태그) ---
            if problem_instance and tag_objects:
                # 기존 태그 연결 모두 삭제
                await db.execute(
                    problem_tags_association_table.delete().where(
                        problem_tags_association_table.c.problem_id == problem_instance.id
                    )
                )
                # 새로운 태그 연결 한번에 삽입
                if tag_objects:
                    await db.execute(
                        insert(problem_tags_association_table).values([
                            {'problem_id': problem_instance.id, 'problemtag_id': tag.id} for tag in tag_objects
                        ])
                    )
            
            created_or_updated_problems.append(problem_instance)

        await db.commit()  # 모든 문제 처리가 성공하면 최종적으로 커밋

    except ValueError as e:  # 파서에서 발생하는 특정 오류 처리
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"ZIP/JSON 파싱 오류: {str(e)}")
    except Exception as e:
        await db.rollback()  # DB 작업 중 오류 발생 시 롤백
        raise HTTPException(status_code=500, detail=f"문제 임포트 중 오류 발생: {str(e)}")
    finally:
        # 4. 임시 ZIP 파일 정리
        if os.path.exists(temp_zip_file_path):
            os.remove(temp_zip_file_path)
        await file.close()

    return created_or_updated_problems
