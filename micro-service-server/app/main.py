from fastapi import FastAPI
from app.config.settings import settings
from app.security.cors import setup_cors
import logging

from app.auth import routes as auth_routes
from app.problem import routes as problem_routes
from app.workbook import routes as workbook_routes
from datetime import datetime

app = FastAPI(**settings.fastapi_kwargs)
setup_cors(app)
logging.basicConfig(level=logging.INFO)

app.include_router(auth_routes.router)
app.include_router(problem_routes.router)
app.include_router(workbook_routes.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Service is running"}


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
