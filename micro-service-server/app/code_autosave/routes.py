from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database
from app.api.deps import get_userdata
from app.user.schemas import UserData
from app.core.auth.guards import require_role

import app.code_autosave.service as serv

router = APIRouter(prefix="/api/code", tags=["code-saving"])


class ReqGetCodeDTO(BaseModel):
    language: str


class ReqSaveCodeDTO(BaseModel):
    language: str
    code: str

class ResCodeDTO(BaseModel):
    code: str


@require_role("Regular User")
@router.post("/{problem_id}")
async def save_code(
        problem_id: int,
        data: ReqSaveCodeDTO,
        userdata: UserData = Depends(get_userdata)):
    await serv.save_code(problem_id, data.language, data.code, userdata)
    return {"status": "ok"}


@require_role("Regular User")
@router.get("/{problem_id}")
async def get_code(
        problem_id: int,
        data: ReqGetCodeDTO = Depends(),
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> ResCodeDTO:
    code = await serv.get_code(problem_id, data.language, userdata.user_id, db)
    return ResCodeDTO(code=code)
