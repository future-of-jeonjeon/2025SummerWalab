from fastapi import APIRouter, Response, Request, Depends
from pydantic import BaseModel
from starlette import status

from app.auth.service import login, logout as auth_logout
from app.security.deps import get_userdata
from app.user.DTO import UserData
from app.utils.logging import logger


router = APIRouter(prefix="/api/auth", tags=["auth"])


# DTO
class LoginRequest(BaseModel):
    token: str


@router.post("/login")
async def login_with_sso(req: LoginRequest, res: Response):
    logger.info("Login requested, Token = %s", req.token)
    cookie_data = await login(req)
    res.set_cookie(**cookie_data)
    res.status_code = status.HTTP_200_OK
    return res


@router.post("/logout")
async def logout_route(req: Request, res: Response):
    cookie_data = await auth_logout(req)
    res.set_cookie(**cookie_data)
    res.status_code = status.HTTP_200_OK
    return res


@router.get("/test")
async def auth_test(userdata: UserData = Depends(get_userdata)):
    return userdata
