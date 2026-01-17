from app.exception import handlers
from app.exception.codes import ErrorCode


def invalid_time_range():
    handlers.bad_request("Start time must occur earlier than end time", ErrorCode.BAD_REQUEST)


def invalid_ip_network(ip_range: str):
    handlers.bad_request(f"{ip_range} is not a valid cidr network", ErrorCode.BAD_REQUEST)


def contest_not_found():
    handlers.not_found("Contest not found", ErrorCode.CONTEST_NOT_FOUND)


def contest_language_not_found():
    # Using generic NOT_FOUND as there is no specific code for contest language yet
    handlers.not_found("Contest language not found", ErrorCode.NOT_FOUND)


def contest_ended():
    handlers.bad_request("Contest has ended", ErrorCode.CONTEST_ENDED)




def display_id_conflict():
    handlers.conflict("Display ID already exists in contest", ErrorCode.CONFLICT)
