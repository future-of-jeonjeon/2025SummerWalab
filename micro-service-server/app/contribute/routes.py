from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database_readonly, get_userdata
from app.user.schemas import UserData

router = APIRouter(prefix="/api/contribute", tags=["contribute"])


from app.problem.schemas import ProblemListResponse
import app.problem.service as serv
from app.workbook.schemas import WorkbookListResponse
import app.workbook.service as wb_serv

@router.get("/problem", response_model=ProblemListResponse)
async def get_contributed_problem_api(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=250),
        user_data: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database_readonly)):
    return await serv.get_contributed_problem(user_data, page, size, db)


@router.get("/workbook", response_model=WorkbookListResponse)
async def get_contributed_workbook_api(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=250),
        user_data: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database_readonly)):
    return await wb_serv.get_contributed_workbooks(user_data, page, size, db)
