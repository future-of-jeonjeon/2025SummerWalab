from datetime import datetime
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_database
from app.problem.routes import router as problem_router


def test_get_daily_problem_api_response(monkeypatch):
    async def _fake_get_or_create(db, target_date=None):
        return SimpleNamespace(
            date="2026-04-03",
            selected_at=datetime(2026, 4, 3, 0, 0, 0),
            problem_id=101,
            title="Daily",
            description="Challenge",
        )

    async def _override_db():
        yield SimpleNamespace()

    import app.problem.service as problem_service

    monkeypatch.setattr(problem_service, "get_or_create_daily_problem", _fake_get_or_create)

    app = FastAPI()
    app.include_router(problem_router)
    app.dependency_overrides[get_database] = _override_db

    with TestClient(app) as client:
        response = client.get("/api/problem/daily")

    assert response.status_code == 200
    payload = response.json()
    assert payload["date"] == "2026-04-03"
    assert payload["problem_id"] == 101
