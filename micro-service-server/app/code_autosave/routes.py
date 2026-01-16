from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database
from app.api.deps import get_userdata
from app.code_autosave.schemas import *
from app.user.schemas import UserData
from app.core.auth.guards import require_role, required_login
from fastapi import Request
import app.code_autosave.service as autosave_serv

router = APIRouter(prefix="/api/code", tags=["code-saving"])


@required_login()
@router.post("/{problem_id}")
async def save_code(
        problem_id: int,
        data: CodeSaveRequest,
        request: Request,
        userdata: UserData = Depends(get_userdata)):
    await autosave_serv.save_code(problem_id, data.language, data.code, userdata)
    return {"status": "ok"}


@required_login()
@router.get("/{problem_id}")
async def get_code(
        problem_id: int,
        request: Request,
        data: ProblemCodeRequest = Depends(),
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> ProblemCodeResponse:
    code = await autosave_serv.get_code(problem_id, data.language, userdata.user_id, db)
    return ProblemCodeResponse(code=code)
