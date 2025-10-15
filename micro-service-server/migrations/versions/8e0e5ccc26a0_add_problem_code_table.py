"""Add problem code table

Revision ID: 8e0e5ccc26a0
Revises: 202409150002
Create Date: 2025-10-12 03:56:49.602782

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = "8e0e5ccc26a0"
down_revision: Union[str, None] = "202409150002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = Inspector.from_engine(connection)
    tables = inspector.get_table_names(schema="public")

    missing = {name for name in ("problem", "user") if name not in tables}
    if missing:
        raise RuntimeError(
            f"Required tables for micro_problem_code are missing: {', '.join(sorted(missing))}"
        )

    if "micro_problem_code" in tables:
        return

    op.create_table(
        "micro_problem_code",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(length=128), nullable=False),
        sa.Column("code", sa.Text(), nullable=True),
        sa.Column(
            "created_time",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.Column(
            "updated_time",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["problem_id"],
            ["public.problem.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["public.user.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_index(
        op.f("ix_public_micro_problem_code_problem_id"),
        "micro_problem_code",
        ["problem_id"],
        unique=False,
        schema="public",
    )
    op.create_index(
        op.f("ix_public_micro_problem_code_user_id"),
        "micro_problem_code",
        ["user_id"],
        unique=False,
        schema="public",
    )


def downgrade() -> None:
    connection = op.get_bind()
    inspector = Inspector.from_engine(connection)
    if "micro_problem_code" not in inspector.get_table_names(schema="public"):
        return

    op.drop_index(
        op.f("ix_public_micro_problem_code_user_id"),
        table_name="micro_problem_code",
        schema="public",
    )
    op.drop_index(
        op.f("ix_public_micro_problem_code_problem_id"),
        table_name="micro_problem_code",
        schema="public",
    )
    op.drop_table("micro_problem_code", schema="public")
