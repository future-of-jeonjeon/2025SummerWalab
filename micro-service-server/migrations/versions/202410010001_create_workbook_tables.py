"""Create workbook tables

Revision ID: 202410010001
Revises: 8e0e5ccc26a0
Create Date: 2025-02-28 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = "202410010001"
down_revision: Union[str, None] = "8e0e5ccc26a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector: Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names(schema="public")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if not _table_exists(inspector, "micro_workbook"):
        op.create_table(
            "micro_workbook",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("category", sa.String(length=100), nullable=True),
            sa.Column("created_by_id", sa.Integer(), nullable=False),
            sa.Column(
                "is_public",
                sa.Boolean(),
                server_default=sa.text("FALSE"),
                nullable=False,
            ),
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
            schema="public",
        )
        op.create_index(
            op.f("ix_public_micro_workbook_id"),
            "micro_workbook",
            ["id"],
            unique=False,
            schema="public",
        )

    inspector = Inspector.from_engine(bind)

    if not _table_exists(inspector, "micro_workbook_problem"):
        op.create_table(
            "micro_workbook_problem",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column(
                "workbook_id",
                sa.Integer(),
                sa.ForeignKey("public.micro_workbook.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "problem_id",
                sa.Integer(),
                sa.ForeignKey("public.problem.id", ondelete="CASCADE"),
                nullable=False,
            ),
            schema="public",
        )
        op.create_index(
            op.f("ix_public_micro_workbook_problem_id"),
            "micro_workbook_problem",
            ["id"],
            unique=False,
            schema="public",
        )
        op.create_index(
            "ix_public_micro_workbook_problem_workbook_id",
            "micro_workbook_problem",
            ["workbook_id"],
            unique=False,
            schema="public",
        )
        op.create_index(
            "ix_public_micro_workbook_problem_problem_id",
            "micro_workbook_problem",
            ["problem_id"],
            unique=False,
            schema="public",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if _table_exists(inspector, "micro_workbook_problem"):
        op.drop_index(
            "ix_public_micro_workbook_problem_problem_id",
            table_name="micro_workbook_problem",
            schema="public",
        )
        op.drop_index(
            "ix_public_micro_workbook_problem_workbook_id",
            table_name="micro_workbook_problem",
            schema="public",
        )
        op.drop_index(
            op.f("ix_public_micro_workbook_problem_id"),
            table_name="micro_workbook_problem",
            schema="public",
        )
        op.drop_table("micro_workbook_problem", schema="public")

    inspector = Inspector.from_engine(bind)

    if _table_exists(inspector, "micro_workbook"):
        op.drop_index(
            op.f("ix_public_micro_workbook_id"),
            table_name="micro_workbook",
            schema="public",
        )
        op.drop_table("micro_workbook", schema="public")
