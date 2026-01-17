from app.exception import handlers
from app.exception.codes import ErrorCode


def members_not_found():
    handlers.not_found("Participation request not found", ErrorCode.NOT_FOUND)


def permission_denied():
    handlers.forbidden("Permission denied for contest management", ErrorCode.FORBIDDEN)
