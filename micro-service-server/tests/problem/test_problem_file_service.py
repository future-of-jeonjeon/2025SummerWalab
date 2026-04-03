import json
from types import SimpleNamespace

import pytest

import app.problem.service as problem_service


def _problem_stub():
    return SimpleNamespace(
        id=10,
        _id="P-10",
        title="A",
        description="B",
        input_description="in",
        output_description="out",
        samples=[{"input": "1", "output": "1"}],
        test_case_id="tc-1",
        test_case_score=[{"input_name": "1.in", "output_name": "1.out", "score": 100}],
        hint=None,
        languages=["python3"],
        template={"python3": "print()"},
        time_limit=1000,
        memory_limit=256,
        io_mode={"io_mode": "standard", "input": "input.txt", "output": "output.txt"},
        spj=False,
        spj_language=None,
        spj_code=None,
        spj_version=None,
        spj_compile_ok=False,
        rule_type="ACM",
        visible=True,
        difficulty="1",
        source=None,
        total_score=100,
        share_submission=False,
        is_public=False,
        tags=[SimpleNamespace(name="math")],
    )


@pytest.mark.asyncio
async def test_export_problem_file(monkeypatch):
    async def _find(problem_id, db):
        return _problem_stub()

    monkeypatch.setattr(problem_service.problem_repository, "find_problem_with_tags_by_id", _find)
    result = await problem_service.export_problem_file(10, SimpleNamespace())
    assert result["schemaVersion"] == 1
    assert result["problem"]["_id"] == "P-10"
    assert result["problem"]["title"] == "A"


@pytest.mark.asyncio
async def test_round_trip_compare(monkeypatch):
    async def _find(problem_id, db):
        return _problem_stub()

    monkeypatch.setattr(problem_service.problem_repository, "find_problem_with_tags_by_id", _find)
    result = await problem_service.validate_problem_round_trip(10, SimpleNamespace())
    assert result.equals is True


@pytest.mark.asyncio
async def test_import_problem_file_validation_error():
    with pytest.raises(Exception):
        await problem_service.import_problem_file(
            file_contents=json.dumps({"schemaVersion": 1, "problem": {"_id": "P"}}).encode("utf-8"),
            user_profile=SimpleNamespace(user_id=1),
            is_admin=False,
            db=SimpleNamespace(),
        )
