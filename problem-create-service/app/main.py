from fastapi import FastAPI
from app.config.settings import settings
from app.config.cors import setup_cors

# Import all models here to ensure they are registered with SQLAlchemy's declarative base
from app.user import models as user_models
from app.problem import models as problem_models

from app.auth import routes as auth_routes
from app.problem import routes as problem_routes
from datetime import datetime

app = FastAPI(**settings.fastapi_kwargs)
setup_cors(app)

app.include_router(auth_routes.router)
app.include_router(problem_routes.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Service is running"}


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
