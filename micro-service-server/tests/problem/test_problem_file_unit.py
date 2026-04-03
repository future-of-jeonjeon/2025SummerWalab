import json
from types import SimpleNamespace

import pytest

import app.problem.service as problem_service


def _problem_stub():
    return SimpleNamespace(
        _id="P-100",
        title="Two Sum",
        description="desc",
        input_description="in",
        output_description="out",
        samples=[{"input": "1 2", "output": "3"}],
        test_case_id="tc-1",
        test_case_score=[{"input_name": "1.in", "output_name": "1.out", "score": 100}],
        hint="hint",
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
        difficulty="3",
        source="src",
        total_score=100,
        share_submission=False,
        is_public=True,
        tags=[SimpleNamespace(name="math"), SimpleNamespace(name="dp")],
    )


def test_problem_file_round_trip_identity_equals():
    problem = _problem_stub()
    payload = problem_service._build_problem_file_payload(problem)
    envelope = {"schemaVersion": 1, "problem": payload.model_dump(by_alias=True)}
    restored = problem_service._parse_problem_file(json.dumps(envelope).encode("utf-8")).problem
    assert problem_service.build_problem_semantic_identity(problem) == problem_service.build_problem_semantic_identity(
        restored
    )


def test_problem_file_invalid_json_raises_http():
    with pytest.raises(Exception):
        problem_service._parse_problem_file(b"{invalid")


def test_problem_file_unsupported_version_raises_http():
    payload = problem_service._build_problem_file_payload(_problem_stub()).model_dump(by_alias=True)
    bad = {"schemaVersion": 999, "problem": payload}
    with pytest.raises(Exception):
        problem_service._parse_problem_file(json.dumps(bad).encode("utf-8"))
