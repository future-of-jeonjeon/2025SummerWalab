"""create micro_daily_problem table

Revision ID: 1a2b3c4d5e6f
Revises: d4a9b8c7e6f5
Create Date: 2026-04-03 10:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, None] = "d4a9b8c7e6f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_daily_problem", "public"):
        return

    op.create_table(
        "micro_daily_problem",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("challenge_date", sa.Date(), nullable=False),
        sa.Column("selected_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["problem_id"], ["public.problem.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("challenge_date", name="uq_micro_daily_problem_challenge_date"),
        schema="public",
    )

    op.create_index(op.f("ix_public_micro_daily_problem_id"), "micro_daily_problem", ["id"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_daily_problem_problem_id"), "micro_daily_problem", ["problem_id"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_daily_problem_challenge_date"), "micro_daily_problem", ["challenge_date"], unique=False, schema="public")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "micro_daily_problem", "public"):
        return

    op.drop_index(op.f("ix_public_micro_daily_problem_challenge_date"), table_name="micro_daily_problem", schema="public")
    op.drop_index(op.f("ix_public_micro_daily_problem_problem_id"), table_name="micro_daily_problem", schema="public")
    op.drop_index(op.f("ix_public_micro_daily_problem_id"), table_name="micro_daily_problem", schema="public")
    op.drop_table("micro_daily_problem", schema="public")
