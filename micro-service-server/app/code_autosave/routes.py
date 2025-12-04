from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.security.deps import get_userdata
from app.user.schemas import UserData
from app.utils.security import authorize_roles
import app.code_autosave.service as serv

router = APIRouter(prefix="/api/code", tags=["code-saving"])


class ReqGetCodeDTO(BaseModel):
    language: str


class ReqSaveCodeDTO(BaseModel):
    language: str
    code: str

class ResCodeDTO(BaseModel):
    code: str


@authorize_roles("Regular User")
@router.post("/{problem_id}")
async def save_code(
        problem_id: int,
        data: ReqSaveCodeDTO,
        userdata: UserData = Depends(get_userdata)):
    await serv.save_code(problem_id, data.language, data.code, userdata)
    return {"status": "ok"}


@authorize_roles("Regular User")
@router.get("/{problem_id}")
async def get_code(
        problem_id: int,
        data: ReqGetCodeDTO = Depends(),
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)) -> ResCodeDTO:
    code = await serv.get_code(problem_id, data.language, userdata.user_id, db)
    return ResCodeDTO(code=code)
