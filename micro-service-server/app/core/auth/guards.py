from inspect import signature

from starlette import status
from fastapi import HTTPException
from functools import wraps
from typing import Any, Callable, Coroutine

from fastapi import Request
from app.api.deps import get_userdata


def required_login():
    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get("request")
            if request is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Not authenticated",
                )
            userdata = await get_userdata()
            kwargs["current_user"] = userdata
            return await func(*args, **kwargs)

        return wrapper
    return decorator


def require_role(*allowed: str):
    def _decorator(fn):
        fn_signature = signature(fn)

        @wraps(fn)
        async def wrapper(*args, **kwargs):
            bound = fn_signature.bind_partial(*args, **kwargs)
            user = bound.arguments.get("userdata")
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                )

            role = getattr(user, "admin_type", None)
            if role == "Super Admin":
                return await fn(*args, **kwargs)
            if role not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permission Error",
                )
            return await fn(*args, **kwargs)

        wrapper.__signature__ = fn_signature

        return wrapper
    return _decorator
