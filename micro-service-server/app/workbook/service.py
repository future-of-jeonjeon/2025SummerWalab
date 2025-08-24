from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.workbook.models import Workbook, WorkbookProblem
from app.user.models import User
from app.workbook.schemas import WorkbookCreate, WorkbookUpdate, WorkbookProblemCreate
from app.config.database import SessionLocal
from typing import List, Optional
from datetime import datetime


class WorkbookService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # async def create_workbook(self, workbook_data: WorkbookCreate, creator_id: int) -> Workbook:
    async def create_workbook(self, workbook_data: WorkbookCreate) -> Workbook:
        """문제집 생성"""
        now = datetime.utcnow()
        workbook = Workbook(
            title=workbook_data.title,
            description=workbook_data.description,
            created_by_id=1,
            # created_by_id = creator_id;
            created_at=now,
            updated_at=now
        )
        self.db.add(workbook)
        await self.db.commit()
        await self.db.refresh(workbook)
        return workbook
    
    async def get_workbook(self, workbook_id: int) -> Optional[Workbook]:
        """문제집 조회"""
        result = await self.db.execute(
            select(Workbook).where(Workbook.id == workbook_id)
        )
        return result.scalar_one_or_none()
    
    async def get_user_workbooks(self, user_id: int) -> List[Workbook]:
        """사용자의 문제집 목록 조회"""
        result = await self.db.execute(
            select(Workbook).where(Workbook.created_by_id == user_id)
        )
        return result.scalars().all()
    
    async def get_public_workbooks(self) -> List[Workbook]:
        """공개 문제집 목록 조회"""
        result = await self.db.execute(
            # select(Workbook).wherer(Workbook.is_public == True)
            select(Workbook)
        )
        return result.scalars().all()
    
    async def update_workbook(self, workbook_id: int, workbook_data: WorkbookUpdate) -> Optional[Workbook]:
        """문제집 수정"""
        workbook = await self.get_workbook(workbook_id)
        if not workbook:
            return None
        
        update_data = workbook_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workbook, field, value)
        
        await self.db.commit()
        await self.db.refresh(workbook)
        return workbook
    
    async def delete_workbook(self, workbook_id: int) -> bool:
        """문제집 삭제"""
        try:
            workbook = await self.get_workbook(workbook_id)
            if not workbook:
                return False
            
            # 먼저 workbook_problem 테이블에서 해당 문제집 ID를 가진 모든 레코드 삭제
            result = await self.db.execute(
                select(WorkbookProblem).where(WorkbookProblem.workbook_id == workbook_id)
            )
            workbook_problems = result.scalars().all()
            
            for workbook_problem in workbook_problems:
                await self.db.delete(workbook_problem)
            
            # 그 다음 문제집 삭제
            await self.db.delete(workbook)
            await self.db.commit()
            return True
            
        except Exception as e:
            await self.db.rollback()
            print(f"Error deleting workbook: {e}")
            return False
    
    async def get_workbook_problems(self, workbook_id: int) -> List[WorkbookProblem]:
        """문제집에 포함된 문제들 조회"""
        result = await self.db.execute(
            select(WorkbookProblem).where(WorkbookProblem.workbook_id == workbook_id)
        )
        return result.scalars().all()
    
    async def add_problem_to_workbook(self, workbook_id: int, problem_data: WorkbookProblemCreate) -> Optional[WorkbookProblem]:
        """문제집에 문제 추가"""
        workbook = await self.get_workbook(workbook_id)
        if not workbook:
            return None
        
        workbook_problem = WorkbookProblem(
            workbook_id=workbook_id,
            problem_id=problem_data.problem_id,
            order=problem_data.order_index  # order_index -> order로 변경
        )
        self.db.add(workbook_problem)
        await self.db.commit()
        await self.db.refresh(workbook_problem)
        return workbook_problem
    
    async def remove_problem_from_workbook(self, workbook_id: int, problem_id: int) -> bool:
        """문제집에서 문제 제거"""
        workbook = await self.get_workbook(workbook_id)
        if not workbook:
            return False
        
        result = await self.db.execute(
            select(WorkbookProblem).where(
                WorkbookProblem.workbook_id == workbook_id,
                WorkbookProblem.problem_id == problem_id
            )
        )
        workbook_problem = result.scalar_one_or_none()
        if not workbook_problem:
            return False
        
        await self.db.delete(workbook_problem)
        await self.db.commit()
        return True

    async def update_workbook_problems(self, workbook_id: int, problem_ids: list[int]) -> bool:
        """문제집 문제 일괄 업데이트"""
        try:
            # 기존 문제집 문제들 모두 삭제
            result = await self.db.execute(
                select(WorkbookProblem).where(WorkbookProblem.workbook_id == workbook_id)
            )
            existing_problems = result.scalars().all()
            
            for problem in existing_problems:
                await self.db.delete(problem)
            
            # 새로운 문제들 추가 (추가된 순서대로)
            for order, problem_id in enumerate(problem_ids):
                workbook_problem = WorkbookProblem(
                    workbook_id=workbook_id,
                    problem_id=problem_id,
                    order=order
                )
                self.db.add(workbook_problem)
            
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            print(f"Error updating workbook problems: {e}")
            return False
