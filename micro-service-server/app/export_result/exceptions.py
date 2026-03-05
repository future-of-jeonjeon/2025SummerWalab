from app.exception import handlers
from app.exception.codes import ErrorCode


def contest_problems_not_found():
    handlers.bad_request("No problems found for contest", ErrorCode.BAD_REQUEST)
