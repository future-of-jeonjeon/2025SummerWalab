# schemas.py
from typing import Optional
from pydantic import BaseModel, Field

class OrganizationCreateData(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class OrganizationUpdateData(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)