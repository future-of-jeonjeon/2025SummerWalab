from datetime import date
from types import SimpleNamespace

import pytest

import app.problem.service as problem_service


@pytest.mark.asyncio
async def test_get_or_create_daily_problem_returns_existing(monkeypatch):
    existing = SimpleNamespace(
        challenge_date=date(2026, 4, 3),
        selected_at=problem_service.datetime.now(problem_service.SEOUL_TZ),
        problem=SimpleNamespace(id=7, title="A", description="B"),
    )

    async def _find_by_date(db, challenge_date):
        return existing

    monkeypatch.setattr(problem_service.problem_repository, "find_daily_problem_by_date", _find_by_date)

    result = await problem_service.get_or_create_daily_problem(SimpleNamespace(), target_date=date(2026, 4, 3))

    assert result.problem_id == 7
    assert result.date == "2026-04-03"


@pytest.mark.asyncio
async def test_get_or_create_daily_problem_creates_once(monkeypatch):
    created = SimpleNamespace(
        challenge_date=date(2026, 4, 3),
        selected_at=problem_service.datetime.now(problem_service.SEOUL_TZ),
        problem=SimpleNamespace(id=22, title="title", description="desc"),
    )

    state = {"exists": False, "created": 0}

    async def _lock(db, key):
        return None

    async def _find_by_date(db, challenge_date):
        return created if state["exists"] else None

    async def _find_candidates(db):
        return [22, 23]

    async def _find_yesterday(db, challenge_date):
        return 23

    async def _create(db, problem_id, challenge_date, selected_at):
        state["exists"] = True
        state["created"] += 1
        return created

    monkeypatch.setattr(problem_service.problem_repository, "lock_daily_problem_selection", _lock)
    monkeypatch.setattr(problem_service.problem_repository, "find_daily_problem_by_date", _find_by_date)
    monkeypatch.setattr(problem_service.problem_repository, "find_daily_candidate_problem_ids", _find_candidates)
    monkeypatch.setattr(problem_service.problem_repository, "find_daily_problem_by_problem_date", _find_yesterday)
    monkeypatch.setattr(problem_service.problem_repository, "create_daily_problem", _create)

    db = SimpleNamespace()
    result1 = await problem_service.get_or_create_daily_problem(db, target_date=date(2026, 4, 3))
    result2 = await problem_service.get_or_create_daily_problem(db, target_date=date(2026, 4, 3))

    assert result1.problem_id == 22
    assert result2.problem_id == 22
    assert state["created"] == 1
