from fastapi import HTTPException

from app.exception.codes import ErrorCode


def raise_http_exception(status_code: int, message: str, error_code: ErrorCode):
    raise HTTPException(status_code=status_code, detail={"code": error_code, "message": message})


def bad_request(message: str, error_code: ErrorCode = ErrorCode.BAD_REQUEST):
    raise_http_exception(400, message, error_code)


def unauthorized(message: str, error_code: ErrorCode = ErrorCode.UNAUTHORIZED):
    raise_http_exception(401, message, error_code)


def forbidden(message: str, error_code: ErrorCode = ErrorCode.FORBIDDEN):
    raise_http_exception(403, message, error_code)


def not_found(message: str, error_code: ErrorCode = ErrorCode.NOT_FOUND):
    raise_http_exception(404, message, error_code)


def conflict(message: str, error_code: ErrorCode = ErrorCode.CONFLICT):
    raise_http_exception(409, message, error_code)
