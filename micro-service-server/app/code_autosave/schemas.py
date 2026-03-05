from pydantic import BaseModel


class ProblemCodeRequest(BaseModel):
    language: str


class CodeSaveRequest(BaseModel):
    language: str
    code: str


class ProblemCodeResponse(BaseModel):
    code: str
