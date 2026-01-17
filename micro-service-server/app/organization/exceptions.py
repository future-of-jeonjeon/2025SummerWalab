from app.exception import handlers
from app.exception.codes import ErrorCode


def organization_not_found():
    handlers.not_found("Organization not found", ErrorCode.ORGANIZATION_NOT_FOUND)
