from app.exception import handlers
from app.exception.codes import ErrorCode


def organization_not_found():
    handlers.not_found("Organization not found", ErrorCode.ORGANIZATION_NOT_FOUND)

def user_not_found():
    handlers.not_found("User not found on Organization", ErrorCode.ORGANIZATION_USER_NOT_FOUND)

def user_already_exist():
    handlers.conflict("User already exist on Organization", ErrorCode.ORGANIZATION_USER_ALREADY_EXIST)

def forbidden():
    handlers.forbidden("User do not have permission to manage organization", ErrorCode.ORGANIZATION_FORBIDDEN)
