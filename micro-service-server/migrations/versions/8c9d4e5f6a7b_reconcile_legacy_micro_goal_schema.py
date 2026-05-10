"""reconcile legacy micro_goal schema

Revision ID: 8c9d4e5f6a7b
Revises: f0b1c2d3e4f5
Create Date: 2026-04-03 12:58:00.000000

"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Optional, Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "8c9d4e5f6a7b"
down_revision: Union[str, None] = "f0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _column_names(inspector: sa.Inspector, table: str, schema: str = "public") -> set[str]:
    return {item["name"] for item in inspector.get_columns(table, schema=schema)}


def _period_days(period: str, custom_days: Optional[int] = None) -> int:
    if period == "daily":
        return 1
    if period == "weekly":
        return 7
    if period == "monthly":
        return 30
    if period == "custom" and custom_days:
        return max(custom_days, 1)
    return 1


def _normalize_period(raw_frequency: Optional[str], start_day: Optional[date], end_day: Optional[date]) -> tuple[str, Optional[int]]:
    frequency = (raw_frequency or "").strip().lower()
    if frequency in {"daily", "weekly", "monthly", "custom"}:
        if frequency == "custom" and start_day and end_day:
            return "custom", max((end_day - start_day).days + 1, 1)
        return frequency, None

    if start_day and end_day:
        days = max((end_day - start_day).days + 1, 1)
        if days == 1:
            return "daily", None
        if days == 7:
            return "weekly", None
        if days == 30:
            return "monthly", None
        return "custom", days

    return "daily", None


def _normalize_type(raw_type: Optional[str]) -> str:
    goal_type = (raw_type or "SOLVE_COUNT").strip().upper()
    if goal_type == "PROBLEM_SOLVE":
        return "SOLVE_COUNT"
    if goal_type == "STREAK":
        return "ATTENDANCE"
    if goal_type in {"SOLVE_COUNT", "ATTENDANCE", "TIER_SOLVE"}:
        return goal_type
    return "SOLVE_COUNT"


def _extract_difficulty(raw_label: Optional[str]) -> Optional[int]:
    if not raw_label:
        return None

    match = re.search(r"(?:LV\.?\s*|난이도\s*)([1-5])", raw_label, re.IGNORECASE)
    if not match:
        match = re.search(r"([1-5])\s*단계", raw_label)
    if not match:
        return None

    return int(match.group(1))


def _create_micro_goal_table(goal_period_enum, goal_type_enum) -> None:
    op.create_table(
        "micro_goal",
        sa.Column("todo_id", sa.BigInteger(), nullable=False),
        sa.Column("period", goal_period_enum, nullable=False),
        sa.Column("type", goal_type_enum, nullable=False),
        sa.Column("target_count", sa.Integer(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("difficulty", sa.Integer(), nullable=True),
        sa.Column("custom_days", sa.Integer(), nullable=True),
        sa.Column("start_day", sa.Date(), nullable=False),
        sa.Column("end_day", sa.Date(), nullable=False),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("created_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["todo_id"], ["public.micro_todo.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_index(op.f("ix_public_micro_goal_id"), "micro_goal", ["id"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_goal_todo_id"), "micro_goal", ["todo_id"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_goal_period"), "micro_goal", ["period"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_goal_type"), "micro_goal", ["type"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_goal_start_day"), "micro_goal", ["start_day"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_goal_end_day"), "micro_goal", ["end_day"], unique=False, schema="public")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "micro_goal", "public"):
        return

    goal_columns = _column_names(inspector, "micro_goal", "public")
    is_legacy_schema = "todo_id" not in goal_columns and "user_id" in goal_columns
    if not is_legacy_schema:
        return

    legacy_rows = bind.execute(
        sa.text(
            """
            SELECT id, user_id, type, target, unit, frequency, start_date, end_date,
                   is_active, label, created_time, updated_time
            FROM public.micro_goal
            ORDER BY id ASC
            """
        )
    ).mappings().all()

    todo_map = {
        row["user_id"]: row["id"]
        for row in bind.execute(
            sa.text("SELECT id, user_id FROM public.micro_todo")
        ).mappings().all()
    }

    goal_period_enum = postgresql.ENUM(
        "daily",
        "weekly",
        "monthly",
        "custom",
        name="goal_period_enum",
        schema="public",
        create_type=False,
    )
    goal_type_enum = postgresql.ENUM(
        "SOLVE_COUNT",
        "ATTENDANCE",
        "TIER_SOLVE",
        name="goal_type_enum",
        schema="public",
        create_type=False,
    )

    op.drop_table("micro_goal", schema="public")
    _create_micro_goal_table(goal_period_enum, goal_type_enum)

    goal_table = sa.table(
        "micro_goal",
        sa.column("id", sa.BigInteger),
        sa.column("todo_id", sa.BigInteger),
        sa.column("period", goal_period_enum),
        sa.column("type", goal_type_enum),
        sa.column("target_count", sa.Integer),
        sa.column("count", sa.Integer),
        sa.column("difficulty", sa.Integer),
        sa.column("custom_days", sa.Integer),
        sa.column("start_day", sa.Date),
        sa.column("end_day", sa.Date),
        sa.column("created_time", sa.DateTime(timezone=True)),
        sa.column("updated_time", sa.DateTime(timezone=True)),
    )

    inserts = []
    for row in legacy_rows:
        if not row["is_active"]:
            continue

        todo_id = todo_map.get(row["user_id"])
        if todo_id is None:
            todo_id = bind.execute(
                sa.text(
                    """
                    INSERT INTO public.micro_todo (user_id, created_time, updated_time)
                    VALUES (:user_id, now(), now())
                    RETURNING id
                    """
                ),
                {"user_id": row["user_id"]},
            ).scalar_one()
            todo_map[row["user_id"]] = todo_id

        period, custom_days = _normalize_period(row["frequency"], row["start_date"], row["end_date"])
        goal_type = _normalize_type(row["type"])
        duration = _period_days(period, custom_days)
        difficulty = _extract_difficulty(row["label"]) if goal_type == "TIER_SOLVE" else None
        target_count = duration if goal_type == "ATTENDANCE" else max(int(row["target"] or 1), 1)

        start_day = row["start_date"] or date.today()
        end_day = row["end_date"] or (start_day + timedelta(days=duration - 1))

        inserts.append(
            {
                "id": row["id"],
                "todo_id": todo_id,
                "period": period,
                "type": goal_type,
                "target_count": target_count,
                "count": 0,
                "difficulty": difficulty,
                "custom_days": custom_days,
                "start_day": start_day,
                "end_day": end_day,
                "created_time": row["created_time"] or datetime.utcnow(),
                "updated_time": row["updated_time"] or datetime.utcnow(),
            }
        )

    if inserts:
        op.bulk_insert(goal_table, inserts)
        bind.execute(
            sa.text(
                """
                SELECT setval(
                    pg_get_serial_sequence('public.micro_goal', 'id'),
                    (SELECT COALESCE(MAX(id), 1) FROM public.micro_goal),
                    true
                )
                """
            )
        )


def downgrade() -> None:
    # This migration is a forward-only schema reconciliation.
    return
