from app.exception import handlers
from app.exception.codes import ErrorCode


def workbook_not_found():
    handlers.not_found("WorkBook not found", ErrorCode.WORKBOOK_NOT_FOUND)


def workbook_forbidden():
    handlers.forbidden("Permission error", ErrorCode.FORBIDDEN)
