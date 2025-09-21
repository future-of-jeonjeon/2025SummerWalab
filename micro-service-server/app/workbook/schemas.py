from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class ProblemSummary(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None

    class Config:
        from_attributes = True


class WorkbookBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = False


class WorkbookCreate(WorkbookBase):
    problem_ids: List[int] = Field(default_factory=list, alias="problemIds")

    class Config:
        from_attributes = True
        allow_population_by_field_name = True


class WorkbookUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None


class WorkbookProblemBase(BaseModel):
    problem_id: int


class WorkbookProblemCreate(WorkbookProblemBase):
    pass


class WorkbookProblem(WorkbookProblemBase):
    id: int
    workbook_id: int
    problem: Optional[ProblemSummary] = None
    
    class Config:
        from_attributes = True


class Workbook(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_by_id: int
    is_public: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WorkbookWithProblems(Workbook):
    problems: List[WorkbookProblem] = []
