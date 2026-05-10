"""create micro_custom_code table

Revision ID: f3c9a1b7d2e4
Revises: e17c9990ac55
Create Date: 2026-03-27 12:25:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3c9a1b7d2e4"
down_revision: Union[str, None] = "e17c9990ac55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_custom_code", "public"):
        return

    op.create_table(
        "micro_custom_code",
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=True),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("created_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["public.user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "file_name", name="uq_micro_custom_code_user_file_name"),
        schema="public",
    )

    op.create_index(op.f("ix_public_micro_custom_code_id"), "micro_custom_code", ["id"], unique=False, schema="public")
    op.create_index(op.f("ix_public_micro_custom_code_user_id"), "micro_custom_code", ["user_id"], unique=False, schema="public")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "micro_custom_code", "public"):
        return

    op.drop_index(op.f("ix_public_micro_custom_code_user_id"), table_name="micro_custom_code", schema="public")
    op.drop_index(op.f("ix_public_micro_custom_code_id"), table_name="micro_custom_code", schema="public")
    op.drop_table("micro_custom_code", schema="public")

