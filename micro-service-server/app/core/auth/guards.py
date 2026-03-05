from inspect import signature

from starlette import status
from app.security import exceptions
from functools import wraps
from typing import Any, Callable, Coroutine

from fastapi import Request
from app.api.deps import get_userdata, get_database


def required_login():
    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get("request")
            if request is None:
                exceptions.internal_auth_error()
            userdata = await get_userdata(request, get_database())
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
            user = bound.arguments.get("userdata") or bound.arguments.get("user_profile")
            if user is None:
                for arg_val in bound.arguments.values():
                    if hasattr(arg_val, "admin_type"):
                        user = arg_val
                        break
            if user is None:
                exceptions.unauthorized_access()

            role = getattr(user, "admin_type", None)
            if role == "Super Admin":
                return await fn(*args, **kwargs)
            if role not in allowed:
                exceptions.forbidden_access()
            return await fn(*args, **kwargs)

        wrapper.__signature__ = fn_signature

        return wrapper
    return _decorator
