from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

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
        # problem.json에 정의되지 않은 필드가 있으면 에러 발생
        extra = 'forbid'