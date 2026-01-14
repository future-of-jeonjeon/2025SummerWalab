import logging
import logging.handlers
import sys

from app.core.settings import settings


def setup_logging() -> None:
    # log_path = settings.LOG_FILE_PATH
    # os.makedirs(os.path.dirname(log_path), exist_ok=True)

    stream_handler = logging.StreamHandler(sys.stdout)

    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    stream_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    if not root.handlers:
        root.addHandler(stream_handler)

    # In container environments, we usually don't need RotatingFileHandler
    # because logs are captured by the container runtime.

    # for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    #     logging.getLogger(name).addHandler(stream_handler)


logger = logging.getLogger("api-server")
