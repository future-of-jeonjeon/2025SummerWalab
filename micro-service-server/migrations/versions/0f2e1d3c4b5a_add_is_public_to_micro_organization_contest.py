"""add is_public to micro_organization_contest

Revision ID: 0f2e1d3c4b5a
Revises: 8c9d4e5f6a7b
Create Date: 2026-04-17 13:55:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0f2e1d3c4b5a"
down_revision: Union[str, None] = "8c9d4e5f6a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _has_column(inspector: sa.Inspector, table: str, column: str, schema: str = "public") -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table, schema=schema))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_organization_contest", "public") and not _has_column(
        inspector, "micro_organization_contest", "is_public", "public"
    ):
        op.add_column(
            "micro_organization_contest",
            sa.Column("is_public", sa.Boolean(), nullable=True),
            schema="public",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_organization_contest", "public") and _has_column(
        inspector, "micro_organization_contest", "is_public", "public"
    ):
        op.drop_column("micro_organization_contest", "is_public", schema="public")
