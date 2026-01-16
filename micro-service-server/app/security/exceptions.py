from app.exception import handlers
from app.exception.codes import ErrorCode
from fastapi import HTTPException, status


def sso_config_error():
    raise HTTPException(status_code=500, detail="SSO_INTROSPECT_URL is not configured")


def sso_unreachable():
    handlers.unauthorized("SSO unreachable", ErrorCode.UNAUTHORIZED)


def sso_unavailable(cause: Exception = None):
    # Depending on handlers capability to wrap cause, or just raise generic 503
    raise HTTPException(status_code=503, detail="SSO service temporarily unavailable") from cause


def missing_token_bad_request():
    handlers.bad_request("Missing token", ErrorCode.BAD_REQUEST)


def missing_token_unauthorized():
    handlers.unauthorized("Missing token", ErrorCode.UNAUTHORIZED)


def invalid_token():
    handlers.unauthorized("Invalid or expired token", ErrorCode.UNAUTHORIZED)


def invalid_sso_token():
    handlers.unauthorized("Invalid SSO token", ErrorCode.UNAUTHORIZED)


def corrupted_session_data():
    # Internal server error for data corruption
    raise HTTPException(status_code=500, detail="Corrupted session data")


def internal_auth_error():
    raise HTTPException(status_code=500, detail="Not authenticated")


def unauthorized_access():
    handlers.unauthorized("Not authenticated", ErrorCode.UNAUTHORIZED)


def forbidden_access():
    handlers.forbidden("Permission Error", ErrorCode.FORBIDDEN)
