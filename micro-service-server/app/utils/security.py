from functools import wraps
from inspect import signature

from fastapi import HTTPException, status


def authorize_roles(*allowed: str):
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
