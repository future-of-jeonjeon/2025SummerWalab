from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class WorkbookBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = False


class WorkbookCreate(WorkbookBase):
    pass


class WorkbookUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None


class WorkbookProblemBase(BaseModel):
    problem_id: int
    order: int


class WorkbookProblemCreate(BaseModel):
    problem_id: int
    order: int


class WorkbookProblem(WorkbookProblemBase):
    id: int
    workbook_id: int
    added_time: datetime 
    
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
