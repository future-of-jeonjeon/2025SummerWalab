from fastapi import APIRouter, Depends, HTTPException
from app.security.deps import get_userdata
from app.user.schemas import UserData
from app.utils.security import authorize_roles
from app.workbook.schemas import WorkbookCreate, Workbook, WorkbookProblem
from app.config.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession
import app.workbook.service as serv

router = APIRouter(prefix="/api/workbook", tags=["workbook"])


@router.post("/", response_model=Workbook)
@authorize_roles("Admin")
async def create_workbook(
        workbook: WorkbookCreate,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.create_workbook(workbook, userdata, db)

@router.get("/", response_model=list[Workbook])
async def get_public_workbooks(
        db: AsyncSession = Depends(get_session)):
    return await serv.get_public_workbooks(db)


@router.get("/all", response_model=list[Workbook])
@authorize_roles("Admin")
async def get_workbooks(
        userdata: UserData = Depends(get_userdata), # 보안검사용
        db: AsyncSession = Depends(get_session)):
    return await serv.get_workbooks(db)


@router.get("/{workbook_id}", response_model=Workbook)
async def get_workbook(
        workbook_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.get_workbook(workbook_id, userdata, db)


@router.put("/{workbook_id}", response_model=Workbook)
@authorize_roles("Admin")
async def update_workbook(
        workbook_id: int,
        workbook: WorkbookCreate,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    updated_workbook = await serv.update_workbook(workbook_id, workbook, db)
    if not updated_workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    return updated_workbook


@router.delete("/{workbook_id}")
async def delete_workbook(
        workbook_id: int,
        db: AsyncSession = Depends(get_session)):
    await serv.delete_workbook(workbook_id, db)


@router.get("/{workbook_id}/problems", response_model=list[WorkbookProblem])
async def get_workbook_problems(
        workbook_id: int,
        db: AsyncSession = Depends(get_session)):
    return await serv.get_workbook_problems(workbook_id, db)


@router.put("/{workbook_id}/problems")
@authorize_roles("Admin")
async def update_workbook_problems(
        workbook_id: int,
        problems_data: dict,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)
):
    return await serv.update_workbook_problems(workbook_id, problems_data.get("problems", []), db)
