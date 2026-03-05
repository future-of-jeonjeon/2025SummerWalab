from app.exception import handlers
from app.exception.codes import ErrorCode


def invalid_time_range():
    handlers.bad_request("Start time must occur earlier than end time", ErrorCode.BAD_REQUEST)


def invalid_ip_network(ip_range: str):
    handlers.bad_request(f"{ip_range} is not a valid cidr network", ErrorCode.BAD_REQUEST)


def contest_not_found():
    handlers.not_found("Contest not found", ErrorCode.CONTEST_NOT_FOUND)


def contest_language_not_found():
    handlers.not_found("Contest language not found", ErrorCode.NOT_FOUND)


def contest_ended():
    handlers.bad_request("Contest has ended", ErrorCode.CONTEST_ENDED)


def display_id_conflict():
    handlers.conflict("Display ID already exists in contest", ErrorCode.CONFLICT)

def not_authenticated():
    handlers.unauthorized("Authentication required", ErrorCode.UNAUTHORIZED)


def cannot_participate_in_ended_contest():
    handlers.bad_request("Cannot join an ended contest", ErrorCode.CONTEST_ENDED)


def members_not_found():
    handlers.not_found("Contest member not found", ErrorCode.NOT_FOUND)


def invalid_contest_id():
    handlers.bad_request("Invalid contest ID", ErrorCode.BAD_REQUEST)


def permission_denied():
    handlers.forbidden("Permission denied", ErrorCode.FORBIDDEN)


def cannot_participate_in_organization_contest():
    handlers.bad_request("Cannot join an organization contest", ErrorCode.CONTEST_USER_NOT_IN_ORGANIZATION)


def contest_announcement_not_found():
    handlers.not_found("Contest announcement not found", ErrorCode.CONTEST_ANNOUNCEMENT_NOT_FOUND)