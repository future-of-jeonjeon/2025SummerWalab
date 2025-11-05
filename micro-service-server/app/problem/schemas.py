from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Sample(BaseModel):
    input: str
    output: str

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
    _id: str
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
    tags: List[ProblemTagSchema] = []

    class Config:
        from_attributes = True  # NOTE: SQLAlchemy 인스턴스를 그대로 직렬화하기 위해 옵션 유지


class ProblemListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    problems: List[ProblemSchema]
