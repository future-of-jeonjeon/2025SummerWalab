import hashlib
import json
import os
import random
import re
import string
import zipfile
from functools import lru_cache
from typing import Dict, List, Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy import Float, asc, case, cast, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.problem import repository as problem_repository
from app.problem.models import Problem
from app.problem.schemas import ImportProblemSerializer
from app.problem.schemas import ProblemListResponse


def rand_str(length=32, type="lower_hex"):
    if type == "str":
        return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))
    elif type == "lower_str":
        return "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(length))
    elif type == "lower_hex":
        return random.choice("123456789abcdef") + "".join(random.choice("0123456789abcdef") for _ in range(length - 1))
    else:
        return random.choice("123456789") + "".join(random.choice("0123456789") for _ in range(length - 1))


def natural_sort_key(s, _nsre=re.compile(r"(\d+)")):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(_nsre, s)]


TEMPLATE_BASE = """//PREPEND BEGIN
{}
//PREPEND END

//TEMPLATE BEGIN
{}
//TEMPLATE END

//APPEND BEGIN
{}
//APPEND END"""


@lru_cache(maxsize=100)
def build_problem_template(prepend, template, append):
    return TEMPLATE_BASE.format(prepend, template, append)


def filter_name_list(name_list, spj, dir=""):
    ret = []
    prefix = 1
    if spj:
        while True:
            in_name = f"{prefix}.in"
            if f"{dir}{in_name}" in name_list:
                ret.append(in_name)
                prefix += 1
                continue
            else:
                return sorted(ret, key=natural_sort_key)
    else:
        while True:
            in_name = f"{prefix}.in"
            out_name = f"{prefix}.out"
            if f"{dir}{in_name}" in name_list and f"{dir}{out_name}" in name_list:
                ret.append(in_name)
                ret.append(out_name)
                prefix += 1
                continue
            else:
                return sorted(ret, key=natural_sort_key)


def process_zip(uploaded_zip_file, spj, dir=""):
    try:
        zip_file = zipfile.ZipFile(uploaded_zip_file, "r")
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Bad zip file")
    name_list = zip_file.namelist()
    test_case_list = filter_name_list(name_list, spj=spj, dir=dir)
    if not test_case_list:
        raise HTTPException(status_code=400, detail="Empty file")

    test_case_id = rand_str()
    # TEST_CASE_BASE_PATH should be defined or imported. Assuming it's available or we use a hardcoded path for now as in routes.py
    TEST_CASE_BASE_PATH = os.getenv("TEST_CASE_DATA_PATH", "/app/test_cases_data")
    test_case_dir = os.path.join(TEST_CASE_BASE_PATH, test_case_id)
    os.makedirs(test_case_dir, exist_ok=True)
    os.chmod(test_case_dir, 0o710)

    size_cache = {}
    md5_cache = {}

    for item in test_case_list:
        with open(os.path.join(test_case_dir, item), "wb") as f:
            content = zip_file.read(f"{dir}{item}").replace(b"\r\n", b"\n")
            size_cache[item] = len(content)
            if item.endswith(".out"):
                md5_cache[item] = hashlib.md5(content.rstrip()).hexdigest()
            f.write(content)
    test_case_info = {"spj": spj, "test_cases": {}}

    info = []

    if spj:
        for index, item in enumerate(test_case_list):
            data = {"input_name": item, "input_size": size_cache[item]}
            info.append(data)
            test_case_info["test_cases"][str(index + 1)] = data
    else:
        # ["1.in", "1.out", "2.in", "2.out"] => [("1.in", "1.out"), ("2.in", "2.out")]
        test_case_list = zip(*[test_case_list[i::2] for i in range(2)])
        for index, item in enumerate(test_case_list):
            data = {"stripped_output_md5": md5_cache[item[1]],
                    "input_size": size_cache[item[0]],
                    "output_size": size_cache[item[1]],
                    "input_name": item[0],
                    "output_name": item[1]}
            info.append(data)
            test_case_info["test_cases"][str(index + 1)] = data

    with open(os.path.join(test_case_dir, "info"), "w", encoding="utf-8") as f:
        f.write(json.dumps(test_case_info, indent=4))

    for item in os.listdir(test_case_dir):
        os.chmod(os.path.join(test_case_dir, item), 0o640)

    return info, test_case_id


async def import_problem(file: UploadFile, db: AsyncSession):
    tmp_file = f"/tmp/{rand_str()}.zip"
    with open(tmp_file, "wb") as f:
        content = await file.read()
        f.write(content)

    count = 0
    try:
        with zipfile.ZipFile(tmp_file, "r") as zf:
            name_list = zf.namelist()
            for item in name_list:
                if "/problem.json" in item:
                    count += 1

            created_problems = []
            for i in range(1, count + 1):
                with zf.open(f"{i}/problem.json") as f:
                    problem_info = json.load(f)
                    # Validate with Pydantic model
                    serializer = ImportProblemSerializer(**problem_info)
                    problem_info = serializer.model_dump()

                    # Process template
                    for k, v in problem_info["template"].items():
                        problem_info["template"][k] = build_problem_template(v["prepend"], v["template"], v["append"])

                    spj = problem_info["spj"] is not None
                    test_case_score = problem_info["test_case_score"]

                    # Process test case
                    _, test_case_id = process_zip(tmp_file, spj=spj, dir=f"{i}/testcase/")

                    # Create Problem object
                    problem = Problem(
                        _id=problem_info["display_id"],
                        title=problem_info["title"],
                        description=problem_info["description"]["value"],
                        input_description=problem_info["input_description"]["value"],
                        output_description=problem_info["output_description"]["value"],
                        hint=problem_info["hint"]["value"],
                        test_case_score=test_case_score if test_case_score else [],
                        time_limit=problem_info["time_limit"],
                        memory_limit=problem_info["memory_limit"],
                        samples=problem_info["samples"],
                        template=problem_info["template"],
                        rule_type=problem_info["rule_type"],
                        source=problem_info["source"],
                        spj=spj,
                        spj_code=problem_info["spj"]["code"] if spj else None,
                        spj_language=problem_info["spj"]["language"] if spj else None,
                        spj_version=rand_str(8) if spj else "",
                        spj_compile_ok=False,
                        languages=problem_info["languages"] if "languages" in problem_info else ["C", "C++", "Java",
                                                                                                 "Python3"],
                        # Default languages if not present
                        # created_by=request.user, # Need to handle user assignment, maybe pass from route or default
                        created_by_id=1,  # Temporary default, should be passed from auth
                        visible=False,
                        difficulty="Mid",  # Default or map from info
                        total_score=sum(item["score"] for item in test_case_score) if problem_info[
                                                                                          "rule_type"] == "OI" else 0,
                        test_case_id=test_case_id,
                        io_mode={"io_mode": "Standard IO", "input": "input.txt", "output": "output.txt"}
                        # Default IO mode
                    )

                    # Handle tags
                    for tag_name in problem_info["tags"]:
                        tag_obj = await problem_repository.get_or_create_tag(db, tag_name)
                        problem.tags.append(tag_obj)

                    created_problems.append(problem)

            return await problem_repository.create_problems(db, created_problems)

    finally:
        if os.path.exists(tmp_file):
            os.remove(tmp_file)


async def get_all_problems(db: AsyncSession) -> List[Problem]:
    return await problem_repository.fetch_all_problems(db)


async def get_tag_count(db: AsyncSession):
    rows = await problem_repository.fetch_tag_counts(db)
    return [{"tag": name, "count": count} for name, count in rows]


async def get_filter_sorted_problems(
        tags: Optional[List[str]],
        sort_option: Optional[str],
        order: Optional[str],
        page: int,
        page_size: int,
        db: AsyncSession,
) -> ProblemListResponse:
    accuracy_expression = case(
        (Problem.submission_number == 0, 0.0),
        else_=cast(Problem.accepted_number, Float) / cast(Problem.submission_number, Float)
    )

    valid_columns = {
        "id": Problem._id,
        "title": Problem.title,
        "difficulty": Problem.difficulty,
        "total_score": Problem.total_score,
        "create_time": Problem.create_time,
        "last_update_time": Problem.last_update_time,
        "submission": Problem.submission_number,
        "submission_count": Problem.submission_number,
        "accuracy": accuracy_expression,
        "accuracy_rate": accuracy_expression,
    }

    column = valid_columns.get(sort_option)
    if column is None:
        raise HTTPException(status_code=400, detail=f"Invalid sort_by parameter: {sort_option}")

    direction = (order or "asc").lower()
    ordering = desc(column) if direction == "desc" else asc(column)

    problems, total_count = await problem_repository.fetch_filtered_problems(
        db,
        tags=tags,
        ordering=ordering,
        page=page,
        page_size=page_size,
    )

    serialized = [_serialize_problem(problem) for problem in problems]

    return ProblemListResponse(
        total=total_count,
        page=page,
        page_size=page_size,
        problems=serialized,
    )


def _serialize_problem(problem: Problem) -> Dict[str, object]:
    difficulty_value = _normalize_difficulty(problem)
    tags = [{"id": tag.id, "name": tag.name} for tag in (problem.tags or [])]

    return {
        "id": problem.id,
        "_id": problem._id,
        "title": problem.title,
        "description": problem.description,
        "time_limit": problem.time_limit,
        "memory_limit": problem.memory_limit,
        "create_time": problem.create_time,
        "last_update_time": problem.last_update_time,
        "created_by_id": problem.created_by_id,
        "rule_type": problem.rule_type,
        "visible": problem.visible,
        "difficulty": difficulty_value,
        "total_score": problem.total_score,
        "test_case_score": problem.test_case_score,
        "submission_number": problem.submission_number,
        "accepted_number": problem.accepted_number,
        "tags": tags,
    }


def _normalize_difficulty(problem: Problem):
    difficulty_value = problem.difficulty
    if not difficulty_value and isinstance(problem.statistic_info, dict):
        difficulty_value = problem.statistic_info.get("difficulty")

    if isinstance(difficulty_value, (int, float)):
        mapping = {3: "상", 2: "중", 1: "하"}
        return mapping.get(int(difficulty_value), difficulty_value)

    if isinstance(difficulty_value, str):
        standardized = difficulty_value.strip().upper()
        mapping = {
            "HARD": "상",
            "MID": "중",
            "EASY": "하",
        }
        return mapping.get(standardized, difficulty_value.strip())

    return difficulty_value


async def get_contest_problem_count(contest_id: int, db: AsyncSession) -> int:
    return await problem_repository.count_contest_problems(db, contest_id)


async def get_problem_count(db):
    return await problem_repository.count_problem(db)
