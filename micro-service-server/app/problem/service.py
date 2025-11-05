from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import Float, asc, case, cast, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.problem import repository as problem_repository
from app.problem.models import Problem
from app.problem.schemas import ProblemListResponse


class ProblemService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_problems(self) -> List[Problem]:
        return await problem_repository.fetch_all_problems(self.db)
    
    async def get_tag_count(self):
        rows = await problem_repository.fetch_tag_counts(self.db)
        return [{"tag": name, "count": count} for name, count in rows]

    async def get_filter_sorted_problems(
        self,
        # 태그로 필털이할 때 태그값 받음
        tags: Optional[List[str]],
        # 정렬옵션 넣을 때 받을 변수
        sort_option: Optional[str],
        # 오름, 내림차순 받을 변수
        order: Optional[str],
        # 페이지네이션 관련
        page: int,
        page_size: int,
    ) -> ProblemListResponse:
        accuracy_expression = case(
            (Problem.submission_number == 0, 0.0),
            else_=cast(Problem.accepted_number, Float) / cast(Problem.submission_number, Float)
        )

        valid_columns = {
            "id": Problem._id,
            "title": Problem.title,
            "difficulty": Problem.difficulty,
            "total_score": Problem.total_score,
            "create_time": Problem.create_time,
            "last_update_time": Problem.last_update_time,
            "submission": Problem.submission_number,
            "submission_count": Problem.submission_number,
            "accuracy": accuracy_expression,
            "accuracy_rate": accuracy_expression,
        }

        column = valid_columns.get(sort_option)
        if column is None:
            raise HTTPException(status_code=400, detail=f"Invalid sort_by parameter: {sort_option}")

        direction = (order or "asc").lower()
        ordering = desc(column) if direction == "desc" else asc(column)

        problems, total_count = await problem_repository.fetch_filtered_problems(
            self.db,
            tags=tags,
            ordering=ordering,
            page=page,
            page_size=page_size,
        )

        serialized = [self._serialize_problem(problem) for problem in problems]

        return ProblemListResponse(
            total=total_count,
            page=page,
            page_size=page_size,
            problems=serialized,
        )

    @staticmethod
    def _serialize_problem(problem: Problem) -> Dict[str, object]:
        difficulty_value = ProblemService._normalize_difficulty(problem)
        tags = [{"id": tag.id, "name": tag.name} for tag in (problem.tags or [])]

        return {
            "id": problem.id,
            "_id": problem._id,
            "title": problem.title,
            "description": problem.description,
            "time_limit": problem.time_limit,
            "memory_limit": problem.memory_limit,
            "create_time": problem.create_time,
            "last_update_time": problem.last_update_time,
            "created_by_id": problem.created_by_id,
            "rule_type": problem.rule_type,
            "visible": problem.visible,
            "difficulty": difficulty_value,
            "total_score": problem.total_score,
            "test_case_score": problem.test_case_score,
            "submission_number": problem.submission_number,
            "accepted_number": problem.accepted_number,
            "tags": tags,
        }

    @staticmethod
    def _normalize_difficulty(problem: Problem):
        difficulty_value = problem.difficulty
        if not difficulty_value and isinstance(problem.statistic_info, dict):
            difficulty_value = problem.statistic_info.get("difficulty")

        if isinstance(difficulty_value, (int, float)):
            mapping = {3: "상", 2: "중", 1: "하"}
            return mapping.get(int(difficulty_value), difficulty_value)

        if isinstance(difficulty_value, str):
            standardized = difficulty_value.strip().upper()
            mapping = {
                "HARD": "상",
                "MID": "중",
                "EASY": "하",
            }
            return mapping.get(standardized, difficulty_value.strip())

        return difficulty_value

    async def get_contest_problem_count(self, contest_id: int) -> int:
        return await problem_repository.count_contest_problems(self.db, contest_id)
