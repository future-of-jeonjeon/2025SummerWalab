import logging
import logging.handlers
import os

# 로그 파일 경로 설정
LOG_FILE_PATH = "/log/app.log"
os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)  # logs 폴더 생성

# 핸들러 설정
stream_handler = logging.StreamHandler()
file_handler = logging.handlers.RotatingFileHandler(
    LOG_FILE_PATH, mode="a", maxBytes=10 * 1024 * 1024, backupCount=15
)

formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
stream_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

# 기본 로깅 설정 (Root Logger)
logging.basicConfig(
    level=logging.INFO,
    handlers=[stream_handler, file_handler]
)

# Uvicorn 로거 설정
for logger_name in ("uvicorn", "uvicorn.error"):
    log = logging.getLogger(logger_name)
    log.addHandler(file_handler)

# 로거 가져오기
logger = logging.getLogger("fastapi_app")


from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.security.security import get_user_session_data
import os

TOKEN_NAME = os.getenv("TOKEN_COOKIE_NAME", "ms_token")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "DELETE"]:
            client_ip = request.client.host if request.client else "Unknown"
            
            # 사용자 정보 추출
            username = "Anonymous"
            token = request.cookies.get(TOKEN_NAME)
            if token:
                try:
                    user_data = await get_user_session_data(token)
                    if user_data:
                        username = user_data.username
                except Exception:
                    pass  # 로그 기록 중 에러가 발생해도 요청 처리는 계속되어야 함

            logger.info(f"[{request.method}] {request.url.path} (User: {username}, IP: {client_ip})")
        
        response = await call_next(request)
        return response