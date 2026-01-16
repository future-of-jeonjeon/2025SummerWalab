from app.exception import handlers
from app.exception.codes import ErrorCode

def language_not_found():
    handlers.bad_request("Wrong Language option", ErrorCode.BAD_REQUEST)


def internal_server_error():
    handlers.internal_server_error("Internal Server Error", ErrorCode.INTERNAL_SERVER_ERROR)
