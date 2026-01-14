from enum import Enum


class ErrorCode(str, Enum):
    # Common
    BAD_REQUEST = "COMMON_400"
    UNAUTHORIZED = "AUTH_401"
    FORBIDDEN = "AUTH_403"
    NOT_FOUND = "COMMON_404"
    CONFLICT = "COMMON_409"
    INTERNAL_SERVER_ERROR = "SERVER_500"

    # Domain Specific (예시)
    USER_NOT_FOUND = "USER_404"
    USER_ALREADY_EXISTS = "USER_409"
