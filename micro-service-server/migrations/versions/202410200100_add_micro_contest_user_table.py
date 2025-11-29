"""add micro contest user table

Revision ID: 202410200100
Revises: f0bcb6bfed55
Create Date: 2025-10-20 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202410200100"
down_revision: Union[str, None] = "f0bcb6bfed55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "micro_contest_user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("contest_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_time",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contest_id", "user_id", name="uq_micro_contest_user_contest_user"),
        schema="public",
    )
    op.create_index(
        op.f("ix_public_micro_contest_user_contest_id"),
        "micro_contest_user",
        ["contest_id"],
        unique=False,
        schema="public",
    )
    op.create_index(
        op.f("ix_public_micro_contest_user_user_id"),
        "micro_contest_user",
        ["user_id"],
        unique=False,
        schema="public",
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_public_micro_contest_user_user_id"),
        table_name="micro_contest_user",
        schema="public",
    )
    op.drop_index(
        op.f("ix_public_micro_contest_user_contest_id"),
        table_name="micro_contest_user",
        schema="public",
    )
    op.drop_table("micro_contest_user", schema="public")
