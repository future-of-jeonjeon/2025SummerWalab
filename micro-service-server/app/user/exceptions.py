from app.exception import handlers
from app.exception.codes import ErrorCode


def user_not_found():
    handlers.not_found("User not found", ErrorCode.USER_NOT_FOUND)


def user_data_not_found():
    handlers.not_found("User data not found", ErrorCode.USER_NOT_FOUND)


def user_data_conflict():
    handlers.conflict("User data already exists", ErrorCode.USER_ALREADY_EXISTS)


def student_id_conflict():
    handlers.conflict("이미 사용중인 학번입니다.", ErrorCode.STUDENT_ID_ALREADY_EXISTS)
