"""normalize org schema for fresh db

Revision ID: c2a1f6f0b9d1
Revises: 81aa563a53b1
Create Date: 2026-03-05 12:25:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c2a1f6f0b9d1"
down_revision: Union[str, None] = "81aa563a53b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _has_column(inspector: sa.Inspector, table: str, column: str, schema: str = "public") -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table, schema=schema))


def _ensure_base_entity_columns(table: str, schema: str = "public") -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not _has_table(inspector, table, schema):
        return

    if not _has_column(inspector, table, "created_time", schema):
        op.add_column(
            table,
            sa.Column("created_time", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            schema=schema,
        )

    if not _has_column(inspector, table, "updated_time", schema):
        op.add_column(
            table,
            sa.Column("updated_time", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            schema=schema,
        )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1) organization_role enum required by OrganizationMember.role
    op.execute(
        text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_role') THEN
                CREATE TYPE organization_role AS ENUM ('MEMBER', 'ORG_ADMIN', 'ORG_SUPER_ADMIN');
              END IF;
            END$$;
            """
        )
    )

    # 2) micro_organization table drift fixes
    if _has_table(inspector, "micro_organization", "public"):
        if not _has_column(inspector, "micro_organization", "img_url", "public"):
            op.add_column("micro_organization", sa.Column("img_url", sa.String(length=512), nullable=True), schema="public")
        _ensure_base_entity_columns("micro_organization", "public")

    # 3) micro_organization_member table drift fixes
    if _has_table(inspector, "micro_organization_member", "public"):
        cols = {c["name"] for c in inspector.get_columns("micro_organization_member", schema="public")}

        # Legacy schema compatibility: member_id -> user_id
        if "member_id" in cols and "user_id" not in cols:
            op.alter_column("micro_organization_member", "member_id", new_column_name="user_id", schema="public")
            cols.remove("member_id")
            cols.add("user_id")

        if "id" not in cols:
            op.add_column(
                "micro_organization_member",
                sa.Column("id", sa.BigInteger(), nullable=False, autoincrement=True),
                schema="public",
            )
            op.execute(
                text(
                    """
                    CREATE SEQUENCE IF NOT EXISTS public.micro_organization_member_id_seq;
                    ALTER TABLE public.micro_organization_member
                      ALTER COLUMN id SET DEFAULT nextval('public.micro_organization_member_id_seq');
                    UPDATE public.micro_organization_member
                      SET id = nextval('public.micro_organization_member_id_seq')
                      WHERE id IS NULL;
                    """
                )
            )

        # Enum column can be absent in fresh/legacy DBs
        if "role" not in cols:
            op.add_column(
                "micro_organization_member",
                sa.Column(
                    "role",
                    postgresql.ENUM("MEMBER", "ORG_ADMIN", "ORG_SUPER_ADMIN", name="organization_role", create_type=False),
                    nullable=False,
                    server_default=sa.text("'MEMBER'::organization_role"),
                ),
                schema="public",
            )

        _ensure_base_entity_columns("micro_organization_member", "public")


def downgrade() -> None:
    # Intentionally no-op: this migration is a defensive schema normalizer.
    pass
