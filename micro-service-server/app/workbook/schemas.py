from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from app.common.page import Page


class ProblemSummary(BaseModel):
    id: int
    original_id: Optional[str] = Field(default=None, alias="_id")
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None
    tags: List[str] = []


    class Config:
        from_attributes = True
        populate_by_name = True

    @field_validator('tags', mode='before')
    @classmethod
    def extract_tag_names(cls, value):
        if value is None:
            return []
        tag_names: List[str] = []
        try:
            for item in value:
                if isinstance(item, str):
                    tag_names.append(item)
                elif hasattr(item, 'name'):
                    tag_names.append(getattr(item, 'name'))
                elif isinstance(item, dict) and 'name' in item:
                    tag_names.append(str(item['name']))
        except TypeError:
            return []
        return tag_names


class WorkbookBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = False


class WorkbookCreate(WorkbookBase):
    problem_ids: List[int] = Field(default_factory=list, alias="problemIds")

    class Config:
        from_attributes = True
        populate_by_name = True


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
    display_order: int

    class Config:
        from_attributes = True


class WorkbookResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_by_id: int
    writer: str = ""
    is_public: bool
    created_at: datetime = Field(..., validation_alias="created_time")
    updated_at: datetime = Field(..., validation_alias="updated_time")
    tags: List[str] = []
    problem_count: int = Field(default=0, serialization_alias="problemCount")

    class Config:
        from_attributes = True


class WorkbookWithProblems(WorkbookResponse):
    problems: List[WorkbookProblem] = []


class WorkbookListResponse(Page[WorkbookResponse]):
    workbooks: List[WorkbookResponse] = Field(..., alias="items")
