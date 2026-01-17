from app.exception import handlers
from app.exception.codes import ErrorCode


def bad_request(message: str = "bad request"):
    handlers.bad_request(message, ErrorCode.BAD_REQUEST)


def invalid_credentials():
    handlers.bad_request("Invalid credentials", ErrorCode.INVALID_CREDENTIALS)
