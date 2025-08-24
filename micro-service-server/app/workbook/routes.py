from fastapi import APIRouter, Depends, HTTPException
from app.workbook.service import WorkbookService
from app.workbook.schemas import WorkbookCreate, Workbook, WorkbookProblemCreate, WorkbookProblem
from app.config.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/workbook", tags=["workbook"])


@router.post("/", response_model=Workbook)
async def create_workbook(
    workbook: WorkbookCreate,
    db: AsyncSession = Depends(get_session)
):
    """문제집 생성"""
    workbook_service = WorkbookService(db)
    return await workbook_service.create_workbook(workbook)


@router.get("/", response_model=list[Workbook])
async def get_workbooks(
    db: AsyncSession = Depends(get_session)
):
    """사용자의 문제집 목록 조회"""
    workbook_service = WorkbookService(db)
    return await workbook_service.get_user_workbooks(1)


@router.get("/{workbook_id}", response_model=Workbook)
async def get_workbook(
    workbook_id: int,
    db: AsyncSession = Depends(get_session)
):
    """특정 문제집 조회"""
    workbook_service = WorkbookService(db)
    workbook = await workbook_service.get_workbook(workbook_id)
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    return workbook


@router.put("/{workbook_id}", response_model=Workbook)
async def update_workbook(
    workbook_id: int,
    workbook: WorkbookCreate,
    db: AsyncSession = Depends(get_session)
):
    """문제집 수정"""
    workbook_service = WorkbookService(db)
    updated_workbook = await workbook_service.update_workbook(workbook_id, workbook)
    if not updated_workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    return updated_workbook


@router.delete("/{workbook_id}")
async def delete_workbook(
    workbook_id: int,
    db: AsyncSession = Depends(get_session)
):
    """문제집 삭제"""
    workbook_service = WorkbookService(db)
    success = await workbook_service.delete_workbook(workbook_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workbook not found")
    return {"message": "Workbook deleted successfully"}


@router.get("/{workbook_id}/problems", response_model=list[WorkbookProblem])
async def get_workbook_problems(
    workbook_id: int,
    db: AsyncSession = Depends(get_session)
):
    """문제집에 포함된 문제들 조회"""
    workbook_service = WorkbookService(db)
    # 먼저 문제집이 존재하는지 확인
    workbook = await workbook_service.get_workbook(workbook_id)
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    problems = await workbook_service.get_workbook_problems(workbook_id)
    return problems


@router.post("/{workbook_id}/problems", response_model=WorkbookProblem)
async def add_problem_to_workbook(
    workbook_id: int,
    problem: WorkbookProblemCreate,
    db: AsyncSession = Depends(get_session)
):
    """문제집에 문제 추가"""
    workbook_service = WorkbookService(db)
    # 먼저 문제집이 존재하는지 확인
    workbook = await workbook_service.get_workbook(workbook_id)
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    result = await workbook_service.add_problem_to_workbook(workbook_id, problem)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to add problem to workbook")
    return result


@router.delete("/{workbook_id}/problems/{problem_id}")
async def remove_problem_from_workbook(
    workbook_id: int,
    problem_id: int,
    db: AsyncSession = Depends(get_session)
):
    """문제집에서 문제 제거"""
    workbook_service = WorkbookService(db)
    # 먼저 문제집이 존재하는지 확인
    workbook = await workbook_service.get_workbook(workbook_id)
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    success = await workbook_service.remove_problem_from_workbook(workbook_id, problem_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove problem from workbook")
    return {"message": "Problem removed from workbook successfully"}


@router.put("/{workbook_id}/problems")
async def update_workbook_problems(
    workbook_id: int,
    problems_data: dict,
    db: AsyncSession = Depends(get_session)
):
    """문제집 문제 일괄 업데이트"""
    workbook_service = WorkbookService(db)
    # 먼저 문제집이 존재하는지 확인
    workbook = await workbook_service.get_workbook(workbook_id)
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    success = await workbook_service.update_workbook_problems(workbook_id, problems_data.get("problems", []))
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update workbook problems")
    return {"message": "Workbook problems updated successfully"}
