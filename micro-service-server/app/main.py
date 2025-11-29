import asyncio
from contextlib import asynccontextmanager, suppress
from datetime import datetime

from fastapi import FastAPI
from sqlalchemy.orm import configure_mappers

from app.auth import routes as auth_routes
from app.code_autosave import routes as auto_save_routes
from app.code_autosave.listener import code_save_listener
from app.config.settings import settings
from app.execution import routes as execution_routes
from app.problem import routes as problem_routes
from app.security.cors import setup_cors
from app.utils.logging import logger
from app.workbook import routes as workbook_routes
from app.organization import routes as organization_routes
from app.organization_ranking import routes as organization_ranking_routes
from app.contest_user import routes as contest_user_routes
import app.monitoring.routes as monitoring_routes
from app.submission import routes as submission_routes
import app.user.routes as user_routes


@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("lifespan started")
    
    # Auto-create tables for new models (JPA-like behavior for new tables)
    from app.config.database import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Auto-DDL: Checked/Created tables.")

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
app.include_router(auth_routes.router)
app.include_router(problem_routes.router)
app.include_router(workbook_routes.router)
app.include_router(execution_routes.router)
app.include_router(auto_save_routes.router)
app.include_router(organization_routes.router)
app.include_router(organization_ranking_routes.router)
app.include_router(contest_user_routes.router)
app.include_router(monitoring_routes.router)
app.include_router(submission_routes.router)
app.include_router(user_routes.router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Service is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
