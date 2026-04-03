"""rebuild todo goal tables

Revision ID: f0b1c2d3e4f5
Revises: 1a2b3c4d5e6f
Create Date: 2026-04-03 23:40:00.000000

"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Sequence, Union
from zoneinfo import ZoneInfo

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f0b1c2d3e4f5"
down_revision: Union[str, None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEOUL_TZ = ZoneInfo("Asia/Seoul")


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _has_column(inspector: sa.Inspector, table: str, column: str, schema: str = "public") -> bool:
    return any(item["name"] == column for item in inspector.get_columns(table, schema=schema))


def _ensure_enum(enum_name: str, values: list[str]) -> None:
    values_sql = ", ".join(f"'{value}'" for value in values)
    op.execute(
        sa.text(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_type
                    WHERE typname = '{enum_name}'
                ) THEN
                    CREATE TYPE public.{enum_name} AS ENUM ({values_sql});
                END IF;
            END
            $$;
            """
        )
    )


def _drop_enum_if_exists(enum_name: str) -> None:
    op.execute(
        sa.text(
            f"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_type
                    WHERE typname = '{enum_name}'
                ) THEN
                    DROP TYPE public.{enum_name};
                END IF;
            END
            $$;
            """
        )
    )


def _period_days(period: str) -> int:
    if period == "daily":
        return 1
    if period == "weekly":
        return 7
    if period == "monthly":
        return 30
    return 1


def _normalize_difficulty(raw) -> int | None:
    if raw is None:
        return None
    try:
        value = int(str(raw).replace("Lv.", "").strip())
    except ValueError:
        return None
    return min(max(value, 1), 5)


def _normalize_goal(raw: dict, fallback_period: str | None = None) -> dict | None:
    period = str(raw.get("period") or fallback_period or "daily").strip().lower()
    if period not in {"daily", "weekly", "monthly"}:
        return None

    goal_type = str(raw.get("type") or "SOLVE_COUNT").strip().upper()
    if goal_type == "PROBLEM_SOLVE":
        goal_type = "SOLVE_COUNT"
    if goal_type == "STREAK":
        goal_type = "ATTENDANCE"
    if goal_type not in {"SOLVE_COUNT", "ATTENDANCE", "TIER_SOLVE"}:
        return None
    if goal_type == "ATTENDANCE" and period == "daily":
        return None

    duration = _period_days(period)
    target_count = duration if goal_type == "ATTENDANCE" else max(int(raw.get("target") or 1), 1)
    difficulty = _normalize_difficulty(raw.get("difficulty")) if goal_type == "TIER_SOLVE" else None
    return {
        "period": period,
        "type": goal_type,
        "target_count": target_count,
        "difficulty": difficulty,
        "custom_days": None,
    }


def _legacy_goal(value: str | None, fallback_period: str) -> dict | None:
    if not value:
        return None

    recommendation_map = {
        "daily_solve_1": {"type": "SOLVE_COUNT", "target": 1},
        "daily_solve_2": {"type": "SOLVE_COUNT", "target": 2},
        "daily_solve_3": {"type": "SOLVE_COUNT", "target": 3},
        "weekly_streak_3": {"type": "ATTENDANCE", "target": 7},
        "weekly_streak_5": {"type": "ATTENDANCE", "target": 7},
        "weekly_streak_7": {"type": "ATTENDANCE", "target": 7},
        "monthly_level_1_3": {"type": "TIER_SOLVE", "target": 3, "difficulty": 1},
        "monthly_level_3_3": {"type": "TIER_SOLVE", "target": 3, "difficulty": 3},
        "monthly_solve_10": {"type": "SOLVE_COUNT", "target": 10},
    }

    if value in recommendation_map:
        normalized = recommendation_map[value]
        return _normalize_goal({"period": fallback_period, **normalized}, fallback_period=fallback_period)

    if not value.startswith("CUSTOM:"):
        return None

    parts = value.split(":")
    goal_type = parts[1] if len(parts) > 1 else "SOLVE_COUNT"
    target = parts[2] if len(parts) > 2 else 1
    label = parts[4] if len(parts) > 4 else ""

    difficulty = None
    if "LV." in label.upper():
        difficulty = _normalize_difficulty(label.upper().split("LV.")[-1].split()[0])

    return _normalize_goal(
        {
            "period": fallback_period,
            "type": goal_type,
            "target": target,
            "difficulty": difficulty,
        },
        fallback_period=fallback_period,
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
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

    _ensure_enum("goal_period_enum", ["daily", "weekly", "monthly", "custom"])
    _ensure_enum("goal_type_enum", ["SOLVE_COUNT", "ATTENDANCE", "TIER_SOLVE"])

    if _has_table(inspector, "micro_todo", "public") and not _has_column(inspector, "micro_todo", "last_attendance_on", "public"):
        op.add_column("micro_todo", sa.Column("last_attendance_on", sa.Date(), nullable=True), schema="public")
        op.create_index(op.f("ix_public_micro_todo_last_attendance_on"), "micro_todo", ["last_attendance_on"], unique=False, schema="public")

    if not _has_table(inspector, "micro_goal", "public"):
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

    if not _has_table(inspector, "micro_todoresult", "public"):
        op.create_table(
            "micro_todoresult",
            sa.Column("todo_id", sa.BigInteger(), nullable=False),
            sa.Column("goal_id", sa.BigInteger(), nullable=False),
            sa.Column("period", goal_period_enum, nullable=False),
            sa.Column("type", goal_type_enum, nullable=False),
            sa.Column("target_count", sa.Integer(), nullable=False),
            sa.Column("count", sa.Integer(), nullable=False),
            sa.Column("difficulty", sa.Integer(), nullable=True),
            sa.Column("custom_days", sa.Integer(), nullable=True),
            sa.Column("start_day", sa.Date(), nullable=False),
            sa.Column("end_day", sa.Date(), nullable=False),
            sa.Column("is_success", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("archived_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("created_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["todo_id"], ["public.micro_todo.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("goal_id", "start_day", "end_day", name="uq_micro_todoresult_goal_period"),
            schema="public",
        )
        op.create_index(op.f("ix_public_micro_todoresult_id"), "micro_todoresult", ["id"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_todoresult_todo_id"), "micro_todoresult", ["todo_id"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_todoresult_goal_id"), "micro_todoresult", ["goal_id"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_todoresult_period"), "micro_todoresult", ["period"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_todoresult_type"), "micro_todoresult", ["type"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_todoresult_start_day"), "micro_todoresult", ["start_day"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_todoresult_end_day"), "micro_todoresult", ["end_day"], unique=False, schema="public")

    today = datetime.now(SEOUL_TZ).date()
    goal_rows = bind.execute(sa.text("SELECT COUNT(*) FROM public.micro_goal")).scalar() or 0
    if goal_rows:
        return

    todo_rows = bind.execute(
        sa.text(
            """
            SELECT id, goals, day_todo, week_todo, month_todo, custom_todo
            FROM public.micro_todo
            """
        )
    ).mappings().all()

    goal_table = sa.table(
        "micro_goal",
        sa.column("todo_id", sa.BigInteger),
        sa.column("period", goal_period_enum),
        sa.column("type", goal_type_enum),
        sa.column("target_count", sa.Integer),
        sa.column("count", sa.Integer),
        sa.column("difficulty", sa.Integer),
        sa.column("custom_days", sa.Integer),
        sa.column("start_day", sa.Date),
        sa.column("end_day", sa.Date),
    )

    inserts: list[dict] = []
    for row in todo_rows:
        normalized_goals: list[dict] = []
        goals = row.get("goals") or []
        if isinstance(goals, list):
            normalized_goals.extend(filter(None, (_normalize_goal(goal) for goal in goals if isinstance(goal, dict))))

        if not normalized_goals:
            normalized_goals.extend(filter(None, [
                _legacy_goal(row.get("day_todo"), "daily"),
                _legacy_goal(row.get("week_todo"), "weekly"),
                _legacy_goal(row.get("month_todo"), "monthly"),
                _legacy_goal(row.get("custom_todo"), "monthly"),
            ]))

        for goal in normalized_goals:
            duration = _period_days(goal["period"])
            inserts.append(
                {
                    "todo_id": row["id"],
                    "period": goal["period"],
                    "type": goal["type"],
                    "target_count": goal["target_count"],
                    "count": 0,
                    "difficulty": goal["difficulty"],
                    "custom_days": goal["custom_days"],
                    "start_day": today,
                    "end_day": today + timedelta(days=duration - 1),
                }
            )

    if inserts:
        op.bulk_insert(goal_table, inserts)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_todoresult", "public"):
        op.drop_index(op.f("ix_public_micro_todoresult_end_day"), table_name="micro_todoresult", schema="public")
        op.drop_index(op.f("ix_public_micro_todoresult_start_day"), table_name="micro_todoresult", schema="public")
        op.drop_index(op.f("ix_public_micro_todoresult_type"), table_name="micro_todoresult", schema="public")
        op.drop_index(op.f("ix_public_micro_todoresult_period"), table_name="micro_todoresult", schema="public")
        op.drop_index(op.f("ix_public_micro_todoresult_goal_id"), table_name="micro_todoresult", schema="public")
        op.drop_index(op.f("ix_public_micro_todoresult_todo_id"), table_name="micro_todoresult", schema="public")
        op.drop_index(op.f("ix_public_micro_todoresult_id"), table_name="micro_todoresult", schema="public")
        op.drop_table("micro_todoresult", schema="public")

    if _has_table(inspector, "micro_goal", "public"):
        op.drop_index(op.f("ix_public_micro_goal_end_day"), table_name="micro_goal", schema="public")
        op.drop_index(op.f("ix_public_micro_goal_start_day"), table_name="micro_goal", schema="public")
        op.drop_index(op.f("ix_public_micro_goal_type"), table_name="micro_goal", schema="public")
        op.drop_index(op.f("ix_public_micro_goal_period"), table_name="micro_goal", schema="public")
        op.drop_index(op.f("ix_public_micro_goal_todo_id"), table_name="micro_goal", schema="public")
        op.drop_index(op.f("ix_public_micro_goal_id"), table_name="micro_goal", schema="public")
        op.drop_table("micro_goal", schema="public")

    if _has_table(inspector, "micro_todo", "public") and _has_column(inspector, "micro_todo", "last_attendance_on", "public"):
        op.drop_index(op.f("ix_public_micro_todo_last_attendance_on"), table_name="micro_todo", schema="public")
        op.drop_column("micro_todo", "last_attendance_on", schema="public")

    _drop_enum_if_exists("goal_type_enum")
    _drop_enum_if_exists("goal_period_enum")
