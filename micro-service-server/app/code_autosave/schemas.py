from pydantic import BaseModel


class ProblemCodeRequest(BaseModel):
    language: str


class CodeSaveRequest(BaseModel):
    language: str
    code: str


class ProblemCodeResponse(BaseModel):
    code: str


class CustomCodeResponse(BaseModel):
    file_name:str
    code: str


class SolvedCodeResponse(BaseModel):
    id: int
    file_name: str
    language: str
    code: str


class CustomCodeRequest(BaseModel):
    file_name:str
    code: str


class RenameCustomCodeRequest(BaseModel):
    old_file_name: str
    new_file_name: str
