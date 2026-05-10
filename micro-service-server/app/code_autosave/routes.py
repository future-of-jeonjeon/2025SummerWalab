from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database
from app.api.deps import get_userdata
from app.common.page import Page
from app.code_autosave.schemas import *
from app.user.schemas import UserProfile
from app.core.auth.guards import required_login
from fastapi import Request
import app.code_autosave.service as autosave_serv

router = APIRouter(prefix="/api/code", tags=["code-saving"])


@required_login()
@router.post("/{problem_id:int}")
async def save_code(
        problem_id: int,
        data: CodeSaveRequest,
        request: Request,
        user_profile: UserProfile = Depends(get_userdata)):
    await autosave_serv.save_problem_code(problem_id, data.language, data.code, user_profile)
    return {"status": "ok"}


@required_login()
@router.post("/file")
async def create_custom_code_api(
        request_data: CustomCodeRequest,
        request: Request,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await autosave_serv.create_custom_code(request_data, user_profile, db)
    return {"status": "ok"}


@required_login()
@router.post("/file/rename")
async def rename_custom_code_api(
        request_data: RenameCustomCodeRequest,
        request: Request,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await autosave_serv.rename_custom_code(request_data.old_file_name, request_data.new_file_name, user_profile, db)
    return {"status": "ok"}


@required_login()
@router.post("/file/{file_name}")
async def save_custom_code_api(
        request: Request,
        file_name: str,
        request_data: CustomCodeRequest,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    request_data.file_name = file_name
    await autosave_serv.save_custom_code(request_data, user_profile, db)
    return {"status": "ok"}


@required_login()
@router.delete("/file/{file_name}")
async def save_custom_code_api(
        file_name: str,
        request: Request,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await autosave_serv.delete_custom_code(file_name, user_profile, db)
    return {"status": "ok"}


@required_login()
@router.get("/file", response_model=CustomCodeResponse)
async def get_code_by_file_name_api(
        request: Request,
        file_name: str = Query(...),
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> CustomCodeResponse:
    return await autosave_serv.get_code_by_file_name(file_name, user_profile, db)


@required_login()
@router.get("/custom-files", response_model=list[CustomCodeResponse])
async def get_all_custom_code_api(
        request: Request,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> list[CustomCodeResponse]:
    return await autosave_serv.get_all_custom_code(user_profile, db)


@required_login()
@router.get("/files", response_model=Page[SolvedCodeResponse])
async def get_all_solved_problem_code_api(
        request: Request,
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=250),
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> Page[SolvedCodeResponse]:
    return await autosave_serv.get_all_solved_problem_code(user_profile, page, size, db)


@required_login()
@router.get("/{problem_id:int}")
async def get_code(
        problem_id: int,
        request: Request,
        data: ProblemCodeRequest = Depends(),
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> ProblemCodeResponse:
    code = await autosave_serv.get_problem_code(problem_id, data.language, user_profile.user_id, db)
    return ProblemCodeResponse(code=code)
