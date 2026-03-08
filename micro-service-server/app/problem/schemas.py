from datetime import datetime
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, Field
from app.common.page import Page


class Sample(BaseModel):
    input: str
    output: str


class ProblemImportPollingStatus(BaseModel):
    status: str
    processed_problem:int
    left_problem:int
    all_problem:int
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    problem_id: Optional[int] = None

class ProblemMetadata(BaseModel):
    display_id: str = Field(..., alias='_id', description="문제의 고유 Display ID")
    title: str
    description: str
    input_description: str
    output_description: str
    time_limit: int = Field(..., gt=0, description="시간 제한 (ms)")
    memory_limit: int = Field(..., gt=0, description="메모리 제한 (MB)")
    samples: List[Sample]
    languages: List[str]
    rule_type: str
    difficulty: str
    template: Dict[str, str] = {}
    hint: Optional[str] = None
    source: Optional[str] = None
    spj: bool = False
    test_case_score: List[Dict[str, Any]] = []

    class Config:
        extra = 'forbid'


class ProblemTagSchema(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TestCaseScoreSchema(BaseModel):
    input_name: str
    output_name: str
    score: int

    class Config:
        from_attributes = True


class ProblemSchema(BaseModel):
    id: int
    _id: Optional[str] = None
    title: str
    description: str
    time_limit: int
    memory_limit: int
    create_time: datetime
    last_update_time: Optional[datetime] = None
    created_by_id: int
    rule_type: str
    visible: bool
    difficulty: Optional[str]
    total_score: int
    submission_number: int
    accepted_number: int
    test_case_score: Optional[List[Dict[str, Any]]] = []
    status: Optional[int] = None
    tags: List[ProblemTagSchema] = []

    class Config:
        from_attributes = True  


class ProblemResponse(ProblemSchema):
    input_description: str
    output_description: str
    samples: List[Dict[str, str]] = []
    languages: List[str] = []
    template: Dict[str, str] = {}
    hint: Optional[str] = None
    source: Optional[str] = None
    io_mode: Dict[str, str] = {}
    is_public: bool = True

class ProblemDetailResponse(ProblemResponse):
    test_case_id: Optional[str] = None
    test_case_score: Optional[List[Dict[str, Any]]] = []

class ProblemListResponse(Page[ProblemSchema]):
    problems: List[ProblemSchema] = Field(..., alias="items")


class ImportProblemSerializer(BaseModel):
    display_id: str
    title: str
    description: Dict[str, str]
    input_description: Dict[str, str]
    output_description: Dict[str, str]
    hint: Dict[str, str]
    time_limit: int
    memory_limit: int
    samples: List[Dict[str, str]]
    template: Dict[str, Dict[str, str]]
    rule_type: str
    source: str
    spj: Optional[Dict[str, str]]
    tags: List[str]
    test_case_score: List[Dict[str, Any]]

class ProblemCreateRequest(BaseModel):
    title: str
    description: str
    input_description: str
    output_description: str
    test_case_id: str
    samples: List[Sample]
    time_limit: int
    memory_limit: int
    languages: List[str]
    template: Dict[str, str]
    difficulty: str
    tags: List[str]
    hint: Optional[str] = None
    solution_code:str
    solution_code_language:str



class CreateProblemData(BaseModel):
    title: str
    description: str
    input_description: str
    output_description: str
    samples: List[Sample]
    time_limit: int
    memory_limit: int
    languages: List[str]
    template: Dict[str, str] = {}
    difficulty: str
    tags: List[str]
    hint: Optional[str] = None
    source: Optional[str] = None
    spj: bool = False
    spj_code: Optional[str] = None
    spj_language: Optional[str] = None
    rule_type: str = "ACM"
    io_mode: Dict[str, str] = {"io_mode": "Standard IO", "input": "input.txt", "output": "output.txt"}
    test_case_score: List[Dict[str, Any]] = []
    visible: bool = True

class ProblemUpdateRequest(BaseModel):
    id: int
    title: Optional[str] = None
    description: Optional[str] = None
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    test_case_id: Optional[str] = None
    samples: Optional[List[Sample]] = None
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None
    languages: Optional[List[str]] = None
    template: Optional[Dict[str, str]] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    hint: Optional[str] = None
    solution_code: Optional[str] = None
    solution_code_language: Optional[str] = None
