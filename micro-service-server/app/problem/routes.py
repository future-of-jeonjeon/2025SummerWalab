from fastapi import APIRouter, Depends, HTTPException
from app.problem.service import ProblemService
from app.config.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/problem", tags=["problem"])


@router.get("/")
async def get_all_problems(
    db: AsyncSession = Depends(get_session)
):
    """모든 문제 목록 조회"""
    problem_service = ProblemService(db)
    problems = await problem_service.get_all_problems()
    return problems
