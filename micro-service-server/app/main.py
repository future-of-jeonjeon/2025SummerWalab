from fastapi import FastAPI
from app.config.settings import settings
from app.security.cors import setup_cors
import logging
from datetime import datetime

from sqlalchemy.orm import configure_mappers
from app.config.database import get_session, engine

from app.auth import routes as auth_routes
from app.problem import routes as problem_routes
from app.workbook import routes as workbook_routes
from app.execution import routes as execution_routes

app = FastAPI(**settings.fastapi_kwargs)
setup_cors(app)
logging.basicConfig(level=logging.INFO)

app.include_router(auth_routes.router)
app.include_router(problem_routes.router)
app.include_router(workbook_routes.router)
app.include_router(execution_routes.router)

async def startup_event():
    try:
        async with engine.begin() as conn:
            pass
        print("Database connection successful.")
        configure_mappers()
    except Exception as e:
        print(f"Database connection failed: {e}")


def root():
    return {"status": "ok", "message": "Service is running"}


def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
