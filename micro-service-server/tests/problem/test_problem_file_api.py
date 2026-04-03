from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_database, get_userdata, get_optional_userdata
from app.problem.routes import router as problem_router


def test_problem_export_api(monkeypatch):
    async def _fake_export(problem_id, db):
        return {
            "schemaVersion": 1,
            "problem": {
                "_id": "P-1",
                "title": "A",
                "description": "B",
                "input_description": "in",
                "output_description": "out",
                "samples": [{"input": "1", "output": "1"}],
                "test_case_id": "tc-1",
                "test_case_score": [{"input_name": "1.in", "output_name": "1.out", "score": 100}],
                "hint": None,
                "languages": ["python3"],
                "template": {"python3": "print()"},
                "time_limit": 1000,
                "memory_limit": 256,
                "io_mode": {"io_mode": "standard", "input": "input.txt", "output": "output.txt"},
                "spj": False,
                "spj_language": None,
                "spj_code": None,
                "spj_version": None,
                "spj_compile_ok": False,
                "rule_type": "ACM",
                "visible": True,
                "difficulty": "1",
                "source": None,
                "total_score": 100,
                "share_submission": False,
                "is_public": False,
                "tags": ["math"],
            },
        }

    async def _override_db():
        yield SimpleNamespace()

    async def _override_user():
        return SimpleNamespace(user_id=1)

    import app.problem.service as problem_service

    monkeypatch.setattr(problem_service, "export_problem_file", _fake_export)

    app = FastAPI()
    app.include_router(problem_router)
    app.dependency_overrides[get_database] = _override_db
    app.dependency_overrides[get_optional_userdata] = _override_user

    with TestClient(app) as client:
        response = client.get("/api/problem/1/export")

    assert response.status_code == 200
    assert response.json()["schemaVersion"] == 1


def test_problem_import_file_api(monkeypatch):
    async def _fake_import(file_contents, user_profile, is_admin, db):
        return {"id": 11, "_id": "P-11"}

    async def _override_db():
        yield SimpleNamespace()

    async def _override_user():
        return SimpleNamespace(user_id=1)

    import app.problem.service as problem_service

    monkeypatch.setattr(problem_service, "import_problem_file", _fake_import)

    app = FastAPI()
    app.include_router(problem_router)
    app.dependency_overrides[get_database] = _override_db
    app.dependency_overrides[get_userdata] = _override_user

    with TestClient(app) as client:
        response = client.post(
            "/api/problem/import/file",
            files={"file": ("problem.json", b'{"schemaVersion":1}', "application/json")},
        )

    assert response.status_code == 200
    assert response.json()["id"] == 11
