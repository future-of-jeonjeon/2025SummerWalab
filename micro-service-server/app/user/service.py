from sqlalchemy.ext.asyncio import AsyncSession

from app.exception import handlers
from app.user import exceptions
from app.user.models import UserData as UserDataEntity
from app.user.schemas import UserProfile, UserProfileResponse, UpdateUserProfileRequest
import app.user.repository as repo


async def check_user_data(user_profile: UserProfile, db: AsyncSession):
    sub_userdata = await repo.find_sub_userdata_by_user_id(user_profile.user_id, db)
    if not sub_userdata:
        exceptions.user_data_not_found()
    return True


async def save_user_data(user_profile_payload: UpdateUserProfileRequest, user_profile: UserProfile, db: AsyncSession) -> UserProfileResponse:
    _validate_user_profile_payload(user_profile_payload)

    check_data = await repo.find_sub_userdata_by_user_id(user_profile.user_id, db)
    if check_data:
        exceptions.user_data_conflict()

    await _ensure_student_id_available(user_profile_payload.student_id, db)

    user = await repo.find_user_by_id(user_profile.user_id, db)
    if not user:
        exceptions.user_not_found()

    entity = _create_user_data_from_schema(user_profile_payload, user_profile.user_id)
    saved_entity = await repo.save_user_data(entity, db)
    return _create_user_profile_response(saved_entity, user_profile)


async def get_user_data(user_profile: UserProfile, db: AsyncSession) -> UserProfileResponse:
    data = await repo.find_sub_userdata_by_user_id(user_profile.user_id, db)
    if not data:
        exceptions.user_data_not_found()
    return _create_user_profile_response(data, user_profile)


async def get_user_data_by_id(user_id: int, db: AsyncSession) -> UserProfileResponse:
    data = await repo.find_sub_userdata_by_user_id(user_id, db)
    if not data:
        exceptions.user_data_not_found()
    return _create_user_profile_response(data)


async def update_user_data(user_profile_payload: UpdateUserProfileRequest, user_profile: UserProfile, db: AsyncSession) -> UserProfileResponse:
    _validate_user_profile_payload(user_profile_payload)

    entity = await repo.find_sub_userdata_by_user_id(user_profile.user_id, db)
    if not entity:
        exceptions.user_data_not_found()

    await _ensure_student_id_available(user_profile_payload.student_id, db, exclude_user_id=user_profile.user_id)

    entity.name = user_profile_payload.name
    entity.student_id = user_profile_payload.student_id
    entity.major_id = user_profile_payload.major_id
    if user_profile_payload.dark_mode_enabled is not None:
        entity.dark_mode_enabled = user_profile_payload.dark_mode_enabled
    if user_profile_payload.language_preferences is not None:
        entity.language_preferences = user_profile_payload.language_preferences

    saved_entity = await repo.save_user_data(entity, db)
    return _create_user_profile_response(saved_entity, user_profile)


async def patch_user_data(payload: UpdateUserProfileRequest, user_profile: UserProfile, db: AsyncSession) -> UserProfileResponse:
    entity = await repo.find_sub_userdata_by_user_id(user_profile.user_id, db)
    if not entity:
        exceptions.user_data_not_found()

    if payload.student_id is not None:
        await _ensure_student_id_available(payload.student_id, db, exclude_user_id=user_profile.user_id)

    if payload.name is not None:
        entity.name = payload.name
    if payload.student_id is not None:
        entity.student_id = payload.student_id
    if payload.major_id is not None:
        entity.major_id = payload.major_id
    if payload.dark_mode_enabled is not None:
        entity.dark_mode_enabled = payload.dark_mode_enabled
    if payload.language_preferences is not None:
        entity.language_preferences = payload.language_preferences

    saved_entity = await repo.save_user_data(entity, db)
    return _create_user_profile_response(saved_entity, user_profile)


def _create_user_profile_response(entity: UserDataEntity, user_profile: UserProfile = None) -> UserProfileResponse:
    username = user_profile.username if user_profile else (entity.user.username if getattr(entity, 'user', None) else None)
    avatar = user_profile.avatar if user_profile else None
    return UserProfileResponse(
        username=username,
        avatar=avatar,
        student_id=entity.student_id,
        major_id=entity.major_id,
        name=entity.name,
        dark_mode_enabled=entity.dark_mode_enabled,
        language_preferences=entity.language_preferences
    )


def _create_user_data_from_schema(schema: UpdateUserProfileRequest, user_id: int) -> UserDataEntity:
    entity = UserDataEntity(
        user_id=user_id,
        name=schema.name,
        student_id=schema.student_id,
        major_id=schema.major_id,
    )
    if schema.dark_mode_enabled is not None:
        entity.dark_mode_enabled = schema.dark_mode_enabled
    if schema.language_preferences is not None:
        entity.language_preferences = schema.language_preferences
    return entity


def _validate_user_profile_payload(schema: UpdateUserProfileRequest):
    if not schema.name or not schema.student_id or schema.major_id is None:
        handlers.bad_request("name, student_id, major_id are required")


async def _ensure_student_id_available(student_id: str, db: AsyncSession, exclude_user_id: int | None = None):
    existing = await repo.find_userdata_by_student_id(student_id, db)
    if existing and existing.user_id != exclude_user_id:
        exceptions.student_id_conflict()
