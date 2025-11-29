from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.contest_user import repository as contest_user_repository
from app.contest_user.models import ContestUser
from app.contest_user.schemas import (
    ContestUserDecisionRequest,
    ContestUserDetail,
    ContestUserListResponse,
    ContestUserStatus,
    ParticipationStatus,
)
from app.user.schemas import UserData
from app.user import repository as user_repository
from app.utils.database import transactional


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_admin(userdata: UserData) -> bool:
    if not userdata or not getattr(userdata, "admin_type", None):
        return False
    return "admin" in userdata.admin_type.lower()

APPROVED: ParticipationStatus = "approved"
PENDING: ParticipationStatus = "pending"
REJECTED: ParticipationStatus = "rejected"


@transactional
async def join_contest(contest_id: int, userdata: UserData, db: AsyncSession) -> ContestUserStatus:
    _ensure_valid_contest_id(contest_id)
    if not userdata:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    is_admin_user = _is_admin(userdata)
    contest = await contest_user_repository.get_contest_by_id(contest_id, db)
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")

    if _has_contest_ended(contest.end_time):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="종료된 대회에는 참여할 수 없습니다.")

    status: ParticipationStatus = APPROVED
    approver = userdata.user_id if is_admin_user else None

    if not is_admin_user and _has_contest_started(contest.start_time):
        status = PENDING

    membership = await contest_user_repository.upsert_membership(contest_id, userdata.user_id, status, approver, db)
    return _build_status(contest_id, userdata, membership, is_admin=is_admin_user)


@transactional
async def get_membership_status(contest_id: int, userdata: UserData, db: AsyncSession) -> ContestUserStatus:
    _ensure_valid_contest_id(contest_id)
    if not userdata:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    is_admin_user = _is_admin(userdata)
    if is_admin_user:
        return ContestUserStatus(
            contest_id=contest_id,
            user_id=userdata.user_id,
            joined=True,
            joined_at=None,
            is_admin=True,
            status=APPROVED,
            requires_approval=False,
        )

    membership = await contest_user_repository.find_by_contest_and_user(contest_id, userdata.user_id, db)
    return _build_status(contest_id, userdata, membership, is_admin=False)


@transactional
async def list_contest_users(contest_id: int, userdata: UserData, db: AsyncSession) -> ContestUserListResponse:
    _ensure_valid_contest_id(contest_id)
    _ensure_admin(userdata)

    rows = await contest_user_repository.list_memberships(contest_id, db)
    approved: List[ContestUserDetail] = []
    pending: List[ContestUserDetail] = []

    for membership, user in rows:
        decided_at = membership.approved_at if membership.status == APPROVED else membership.updated_time
        detail = ContestUserDetail(
            user_id=membership.user_id,
            username=getattr(user, "username", None),
            status=membership.status,
            applied_at=membership.created_time,
            decided_at=decided_at,
            decided_by=membership.approved_by,
        )
        if membership.status == PENDING:
            pending.append(detail)
        elif membership.status == APPROVED:
            approved.append(detail)

    return ContestUserListResponse(approved=approved, pending=pending)


@transactional
async def decide_contest_user(
    contest_id: int,
    decision: ContestUserDecisionRequest,
    userdata: UserData,
    db: AsyncSession,
) -> ContestUserDetail:
    _ensure_valid_contest_id(contest_id)
    _ensure_admin(userdata)

    target_status = APPROVED if decision.action == "approve" else REJECTED
    membership = await contest_user_repository.update_membership_status(
        contest_id,
        decision.user_id,
        target_status,
        userdata.user_id,
        db,
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="참여 신청을 찾을 수 없습니다.")

    user = await user_repository.find_user_by_id(decision.user_id, db)
    username = getattr(user, "username", None) if user else None
    decided_at = membership.approved_at if membership.status == APPROVED else membership.updated_time
    return ContestUserDetail(
        user_id=membership.user_id,
        username=username,
        status=membership.status,
        applied_at=membership.created_time,
        decided_at=decided_at,
        decided_by=membership.approved_by,
    )


def _ensure_valid_contest_id(contest_id: int) -> None:
    if contest_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid contest id")


def _has_contest_started(start_time: datetime | None) -> bool:
    normalized_start = _normalize_datetime(start_time)
    if normalized_start is None:
        return False
    now = datetime.now(timezone.utc)
    return now >= normalized_start


def _has_contest_ended(end_time: datetime | None) -> bool:
    normalized_end = _normalize_datetime(end_time)
    if normalized_end is None:
        return False
    now = datetime.now(timezone.utc)
    return now > normalized_end


def _build_status(
    contest_id: int,
    userdata: UserData,
    membership: ContestUser | None,
    *,
    is_admin: bool,
) -> ContestUserStatus:
    status = membership.status if membership else (APPROVED if is_admin else None)
    joined = (status == APPROVED) or is_admin
    joined_at = membership.created_time if membership else None
    requires_approval = status == PENDING
    return ContestUserStatus(
        contest_id=contest_id,
        user_id=userdata.user_id,
        joined=joined,
        joined_at=joined_at,
        is_admin=is_admin,
        status=status,
        requires_approval=requires_approval,
    )


def _ensure_admin(userdata: UserData) -> None:
    if not _is_admin(userdata):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied for contest management")
