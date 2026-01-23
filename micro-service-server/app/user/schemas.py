from pydantic import BaseModel

class UserData(BaseModel):
    user_id:int
    username: str
    avatar: str
    admin_type: str


    class Config:
        from_attributes = True

class SubUserData(BaseModel):
    user_id: int
    student_id: str
    major_id: int
    name : str

    class Config:
        from_attributes = True