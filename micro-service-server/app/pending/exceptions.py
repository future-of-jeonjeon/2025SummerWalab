from app.exception import handlers
from app.exception.codes import ErrorCode


def pending_bad_request():
    handlers.bad_request("pending request cannot be in progress", ErrorCode.PENDING_BAD_REQUEST)

def pending_not_found():
    handlers.not_found("pending not found", ErrorCode.PENDING_NOT_FOUND)

def pending_already_done():
    handlers.bad_request("pending already done", ErrorCode.PENDING_ALREADY_DONE)

def pending_has_expired():
    handlers.bad_request("pending has expired", ErrorCode.PENDING_HAS_EXPIRED)
