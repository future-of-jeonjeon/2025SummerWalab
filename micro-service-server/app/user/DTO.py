from pydantic import BaseModel

class UserData(BaseModel):
    user_id:int
    username: str
    avatar: str
    admin_type: str
