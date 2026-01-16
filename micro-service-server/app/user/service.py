from sqlalchemy.ext.asyncio import AsyncSession

from app.user.schemas import UserData, SubUserData
from app.user.models import UserData
import app.user.repository as repo
from app.user import exceptions


async def check_user_data(user_data: UserData, db: AsyncSession):
    sub_userdata = await repo.find_sub_userdata_by_user_id(user_data.user_id, db)
    if not sub_userdata:
        exceptions.user_data_not_found()
    return True


async def save_user_data(sub_user_data: SubUserData, user_data: UserData, db: AsyncSession) -> SubUserData:
    check_data = await repo.find_sub_userdata_by_user_id(user_data.user_id, db)
    if check_data:
        exceptions.user_data_conflict()

    user = await repo.find_user_by_id(user_data.user_id, db)
    if not user:
        exceptions.user_not_found()

    entity = _create_user_data_from_schema(sub_user_data)
    saved_entity = await repo.save_user_data(entity, db)
    return _create_sub_user_data_from_entity(saved_entity)


async def get_user_data(user_data: UserData, db: AsyncSession) -> SubUserData:
    data = await repo.find_sub_userdata_by_user_id(user_data.user_id, db)
    if not data:
        exceptions.user_data_not_found()
    return _create_sub_user_data_from_entity(data)


async def get_user_data_by_id(user_id: int, db: AsyncSession) -> SubUserData:
    data = await repo.find_sub_userdata_by_user_id(user_id, db)
    if not data:
        exceptions.user_data_not_found()
    return _create_sub_user_data_from_entity(data)


async def update_user_data(sub_user_data: SubUserData, user_data: UserData, db: AsyncSession) -> SubUserData:
    entity = await repo.find_sub_userdata_by_user_id(user_data.user_id, db)
    if not entity:
        exceptions.user_data_not_found()

    entity.name = sub_user_data.name
    entity.student_id = sub_user_data.student_id
    entity.major_id = sub_user_data.major_id

    saved_entity = await repo.save_user_data(entity, db)
    return _create_sub_user_data_from_entity(saved_entity)


def _create_sub_user_data_from_entity(entity: UserData) -> SubUserData:
    return SubUserData(
        user_id=entity.user_id,
        name=entity.name,
        student_id=entity.student_id,
        major_id=entity.major_id,
    )


def _create_user_data_from_schema(schema: SubUserData) -> UserData:
    return UserData(
        user_id=schema.user_id,
        name=schema.name,
        student_id=schema.student_id,
        major_id=schema.major_id,
    )
