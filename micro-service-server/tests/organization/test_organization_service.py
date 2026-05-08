from types import SimpleNamespace
from typing import Dict, Optional

import pytest

import app.organization.service as organization_service


class FakeRedis:
    def __init__(self, store: Optional[Dict[str, str]] = None):
        self.store = store or {}
        self.deleted: list[str] = []

    async def get(self, key: str):
        return self.store.get(key)

    async def delete(self, key: str):
        self.deleted.append(key)
        self.store.pop(key, None)


class FakeOrganizationMember:
    def __init__(self, organization, user):
        self.organization = organization
        self.organization_id = organization.id
        self.user = user
        self.user_id = user.user_id
        self.role = organization_service.OrganizationRole.MEMBER


def _patch_common_dependencies(monkeypatch, redis: FakeRedis, existing_members: set[tuple[int, int]]):
    async def _get_redis_manage_code():
        return redis

    async def _get_org(_organization_id, _db):
        return SimpleNamespace(id=7)

    async def _find_user_by_id(user_id, _db):
        return SimpleNamespace(id=user_id)

    async def _find_sub_userdata_by_user_id(user_id, _db):
        return SimpleNamespace(user_id=user_id)

    async def _get_member(organization_id, user_id, _db):
        if (organization_id, user_id) in existing_members:
            return SimpleNamespace(id=1, organization_id=organization_id, user_id=user_id)
        return None

    async def _save_member(member, _db):
        existing_members.add((member.organization_id, member.user_id))
        return member

    monkeypatch.setattr(organization_service, "OrganizationMember", FakeOrganizationMember)
    monkeypatch.setattr(organization_service, "get_redis_manage_code", _get_redis_manage_code)
    monkeypatch.setattr(organization_service, "_get_organization_by_id", _get_org)
    monkeypatch.setattr(organization_service.user_repo, "find_user_by_id", _find_user_by_id)
    monkeypatch.setattr(organization_service.user_repo, "find_sub_userdata_by_user_id", _find_sub_userdata_by_user_id)
    monkeypatch.setattr(organization_service.organization_repo, "get_member_by_organization_id_and_user_id", _get_member)
    monkeypatch.setattr(organization_service.organization_repo, "save_organization_member", _save_member)
    monkeypatch.setattr(
        organization_service.OrganizationMemberResponse,
        "from_orm",
        classmethod(
            lambda cls, member: SimpleNamespace(
                organization_id=member.organization_id,
                user_id=member.user_id,
                role=member.role,
            )
        ),
    )


@pytest.mark.asyncio
async def test_join_organization_allows_reusing_same_invite_code(monkeypatch):
    redis = FakeRedis({"invite-code": "organization_join:7:99"})
    existing_members: set[tuple[int, int]] = set()
    _patch_common_dependencies(monkeypatch, redis, existing_members)

    first = await organization_service.join_organization(
        7,
        SimpleNamespace(user_id=101),
        "invite-code",
        SimpleNamespace(),
    )
    second = await organization_service.join_organization(
        7,
        SimpleNamespace(user_id=202),
        "invite-code",
        SimpleNamespace(),
    )

    assert first.user_id == 101
    assert second.user_id == 202
    assert existing_members == {(7, 101), (7, 202)}
    assert redis.deleted == []
    assert redis.store["invite-code"] == "organization_join:7:99"


@pytest.mark.asyncio
async def test_join_organization_duplicate_member_does_not_invalidate_invite_code(monkeypatch):
    redis = FakeRedis({"invite-code": "organization_join:7:99"})
    existing_members: set[tuple[int, int]] = {(7, 101)}
    _patch_common_dependencies(monkeypatch, redis, existing_members)

    monkeypatch.setattr(
        organization_service.organization_exception,
        "user_already_exist",
        lambda: (_ for _ in ()).throw(RuntimeError("already-member")),
    )

    with pytest.raises(RuntimeError, match="already-member"):
        await organization_service.join_organization(
            7,
            SimpleNamespace(user_id=101),
            "invite-code",
            SimpleNamespace(),
        )

    assert redis.deleted == []
    assert redis.store["invite-code"] == "organization_join:7:99"
