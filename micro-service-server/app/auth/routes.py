from fastapi import APIRouter, Response, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.auth.schemas import LoginRequest
from app.api.deps import get_database, get_userdata
from app.core.auth.guards import require_role
from app.core.logger import logger

import app.auth.service as auth_service
from app.user.schemas import UserProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login_with_sso_api(
        req: LoginRequest,
        res: Response,
        db: AsyncSession = Depends(get_database)):
    logger.info("Login requested, Token = %s", req.token)
    cookie_data = await auth_service.login(req, db)
    res.set_cookie(**cookie_data)
    res.status_code = status.HTTP_200_OK
    return res


@router.post("/logout")
async def logout_api(
        req: Request,
        res: Response,
        db: AsyncSession = Depends(get_database)):
    cookie_data = await auth_service.logout(req, db)
    res.set_cookie(**cookie_data)
    res.status_code = status.HTTP_200_OK
    return res


@require_role("Admin")
@router.post("/session/reset/all")
async def all_user_session_reset_api(
        db: AsyncSession = Depends(get_database)):
    await auth_service.all_user_session_reset_api(db)
    return {"ok"}


@require_role("Admin")
@router.post("/session/reset/{user_id}")
async def user_session_reset_api(
        user_id: int,
        db: AsyncSession = Depends(get_database)):
    await auth_service.user_session_reset(user_id, db)
    return {"ok"}
