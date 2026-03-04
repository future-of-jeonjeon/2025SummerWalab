from pydantic import BaseModel


class UserProfile(BaseModel):
    user_id: int
    username: str | None = None
    avatar: str | None = None
    admin_type: str | None = None
    student_id: str | None = None
    major_id: int | None = None
    name: str | None = None
    dark_mode_enabled: bool | None = None
    language_preferences: list[str] | None = None

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    username: str | None = None
    avatar: str | None = None
    student_id: str | None = None
    major_id: int | None = None
    name: str | None = None
    dark_mode_enabled: bool
    language_preferences: list[str]

    class Config:
        from_attributes = True


class UpdateUserProfileRequest(BaseModel):
    username: str | None = None
    avatar: str | None = None
    student_id: str | None = None
    major_id: int | None = None
    name: str | None = None
    dark_mode_enabled: bool | None = None
    language_preferences: list[str] | None = None

    class Config:
        from_attributes = True
