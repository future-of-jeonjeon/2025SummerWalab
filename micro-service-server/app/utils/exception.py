from fastapi import HTTPException


def raise_http_exception(status_code: int, message: str):
    raise HTTPException(status_code=status_code, detail=message)


def data_not_found(data: str = "Data"):
    raise_http_exception(404, f"{data} Not Found")


def data_conflict(data: str = "Data"):
    raise_http_exception(409, f"{data} Already Exists")


def bad_request(message: str = "Bad Request"):
    raise_http_exception(400, message)


def unauthorized(message: str = "Unauthorized"):
    raise_http_exception(401, message)


def forbidden(message: str = "Forbidden"):
    raise_http_exception(403, message)


def internal_error(message: str = "Internal Server Error"):
    raise_http_exception(500, message)
