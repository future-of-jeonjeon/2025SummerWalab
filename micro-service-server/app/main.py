import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from sqlalchemy.orm import configure_mappers

from app.api.api_router import api_router
from app.code_autosave.listener import code_save_listener
from app.config.settings import settings
from app.security.cors import setup_cors
from app.utils.logging import logger, LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("lifespan started")
    listener_task = asyncio.create_task(code_save_listener())
    configure_mappers()
    logger.info("DB mappers configured.")
    try:
        yield
    finally:
        listener_task.cancel()
        with suppress(asyncio.CancelledError):
            await listener_task


app = FastAPI(lifespan=lifespan, **settings.fastapi_kwargs)
setup_cors(app)
app.include_router(api_router)
app.add_middleware(LoggingMiddleware)
