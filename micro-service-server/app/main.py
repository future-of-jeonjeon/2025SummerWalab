import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from sqlalchemy.orm import configure_mappers

from app.api.api_router import api_router
from app.code_autosave.listener import code_save_listener
from app.core.cors import setup_cors
from app.core.logger import logger
from app.core.logger import setup_logging
from app.problem.cron import daily_problem_cron_bot


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("lifespan started")
    listener_task = asyncio.create_task(code_save_listener())
    daily_problem_task = asyncio.create_task(daily_problem_cron_bot())
    configure_mappers()
    logger.info("DB mappers configured.")
    try:
        yield
    finally:
        listener_task.cancel()
        daily_problem_task.cancel()
        with suppress(asyncio.CancelledError):
            await listener_task
        with suppress(asyncio.CancelledError):
            await daily_problem_task


app = FastAPI(lifespan=lifespan)
setup_cors(app)
app.include_router(api_router)
