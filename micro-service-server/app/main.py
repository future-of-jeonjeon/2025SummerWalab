import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from sqlalchemy.orm import configure_mappers
from app.auth import routes as auth_routes
from app.code_autosave.listener import code_save_listener  # 리스너 import
from app.config.database import engine, Base
from app.config.settings import settings
from app.execution import routes as execution_routes
from app.problem import routes as problem_routes
from app.security.cors import setup_cors
from app.utils.logging import logger
from app.workbook import routes as workbook_routes

app = FastAPI(**settings.fastapi_kwargs)
setup_cors(app)

app.include_router(auth_routes.router)
app.include_router(problem_routes.router)
app.include_router(workbook_routes.router)
app.include_router(execution_routes.router)


@asynccontextmanager
async def start_up():
    #redis pubsub listener
    asyncio.create_task(code_save_listener())

    # db set
    try:
        configure_mappers()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("DB init success")
    except Exception:
        logger.exception("DB init fail")



def root():
    return {"status": "ok", "message": "Service is running"}


def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
