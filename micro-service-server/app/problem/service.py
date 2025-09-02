from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.problem.models import Problem
from typing import List


class ProblemService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_problems(self) -> List[Problem]:
        result = await self.db.execute(
            select(Problem)
            .options(selectinload(Problem.tags))
            .order_by(Problem.id)
        )
        return result.scalars().all()
