from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.problem.models import Problem
from typing import List


class ProblemService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_problems(self) -> List[Problem]:
        """모든 문제 목록 조회"""
        result = await self.db.execute(
            select(Problem).order_by(Problem.id)
        )
        return result.scalars().all()
