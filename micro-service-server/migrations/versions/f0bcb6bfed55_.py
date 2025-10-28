"""empty message

Revision ID: f0bcb6bfed55
Revises: 202410010001
Create Date: 2025-10-16 00:37:11.551658

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'f0bcb6bfed55'
down_revision: Union[str, None] = '202410010001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(connection, table_name: str) -> bool:
    result = connection.exec_driver_sql(
        text("SELECT to_regclass(:qualified_name)"),
        {"qualified_name": f"public.{table_name}"},
    ).scalar()
    return result is not None


def _index_exists(connection, table_name: str, index_name: str) -> bool:
    result = connection.exec_driver_sql(
        text(
            """
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = :table_name
              AND indexname = :index_name
            """
        ),
        {"table_name": table_name, "index_name": index_name},
    ).fetchone()
    return result is not None


def _fk_exists(inspector: Inspector, table_name: str, fk_name: str) -> bool:
    return any(fk["name"] == fk_name for fk in inspector.get_foreign_keys(table_name, schema="public"))


def _column_exists(inspector: Inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name, schema="public"))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    table_name = 'micro_problem_code'
    if not _table_exists(bind, table_name):
        op.create_table(
            table_name,
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('problem_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('language', sa.String(length=128), nullable=False),
            sa.Column('code', sa.Text(), nullable=True),
            sa.Column('created_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['problem_id'], ['public.problem.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['public.user.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('problem_id', 'user_id', 'language', name='uq_micro_problem_code_pul'),
            schema='public'
        )
        op.create_index(op.f('ix_public_micro_problem_code_id'), table_name, ['id'], unique=False, schema='public')
        op.create_index(op.f('ix_public_micro_problem_code_problem_id'), table_name, ['problem_id'], unique=False, schema='public')
        op.create_index(op.f('ix_public_micro_problem_code_user_id'), table_name, ['user_id'], unique=False, schema='public')
    else:
        # ensure required indexes exist when table already present
        if not _index_exists(bind, table_name, op.f('ix_public_micro_problem_code_id')):
            op.create_index(op.f('ix_public_micro_problem_code_id'), table_name, ['id'], unique=False, schema='public')
        if not _index_exists(bind, table_name, op.f('ix_public_micro_problem_code_problem_id')):
            op.create_index(op.f('ix_public_micro_problem_code_problem_id'), table_name, ['problem_id'], unique=False, schema='public')
        if not _index_exists(bind, table_name, op.f('ix_public_micro_problem_code_user_id')):
            op.create_index(op.f('ix_public_micro_problem_code_user_id'), table_name, ['user_id'], unique=False, schema='public')

    inspector = Inspector.from_engine(bind)
    if _table_exists(bind, 'micro_workbook') and _column_exists(inspector, 'micro_workbook', 'is_public'):
        op.alter_column(
            'micro_workbook',
            'is_public',
            existing_type=sa.BOOLEAN(),
            nullable=True,
            existing_server_default=sa.text('false'),
        )

    inspector = Inspector.from_engine(bind)
    mwp_table = 'micro_workbook_problem'
    if _table_exists(inspector, mwp_table):
        problem_idx = op.f('ix_public_micro_workbook_problem_problem_id')
        workbook_idx = op.f('ix_public_micro_workbook_problem_workbook_id')
        if _index_exists(bind, mwp_table, problem_idx):
            op.drop_index(problem_idx, table_name=mwp_table)
        if _index_exists(bind, mwp_table, workbook_idx):
            op.drop_index(workbook_idx, table_name=mwp_table)

        fk_problem = op.f('micro_workbook_problem_problem_id_fkey')
        fk_workbook = op.f('micro_workbook_problem_workbook_id_fkey')
        if _fk_exists(inspector, mwp_table, fk_problem):
            op.drop_constraint(fk_problem, mwp_table, type_='foreignkey')
        if _fk_exists(inspector, mwp_table, fk_workbook):
            op.drop_constraint(fk_workbook, mwp_table, type_='foreignkey')

        if not _fk_exists(inspector, mwp_table, fk_problem):
            op.create_foreign_key(
                None,
                mwp_table,
                'problem',
                ['problem_id'],
                ['id'],
                source_schema='public',
                referent_schema='public',
            )
        if not _fk_exists(inspector, mwp_table, fk_workbook):
            op.create_foreign_key(
                None,
                mwp_table,
                'micro_workbook',
                ['workbook_id'],
                ['id'],
                source_schema='public',
                referent_schema='public',
                ondelete='CASCADE',
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    mwp_table = 'micro_workbook_problem'
    if _table_exists(inspector, mwp_table):
        # drop the FKs that were added in upgrade if they exist
        for fk_name in (
            op.f('micro_workbook_problem_workbook_id_fkey'),
            op.f('micro_workbook_problem_problem_id_fkey'),
        ):
            if _fk_exists(inspector, mwp_table, fk_name):
                op.drop_constraint(fk_name, mwp_table, schema='public', type_='foreignkey')

        op.create_foreign_key(
            op.f('micro_workbook_problem_workbook_id_fkey'),
            mwp_table,
            'micro_workbook',
            ['workbook_id'],
            ['id'],
            ondelete='CASCADE',
        )
        op.create_foreign_key(
            op.f('micro_workbook_problem_problem_id_fkey'),
            mwp_table,
            'problem',
            ['problem_id'],
            ['id'],
            ondelete='CASCADE',
        )

        # recreate indexes if missing
        if not _index_exists(inspector, mwp_table, op.f('ix_public_micro_workbook_problem_workbook_id')):
            op.create_index(
                op.f('ix_public_micro_workbook_problem_workbook_id'),
                mwp_table,
                ['workbook_id'],
                unique=False,
            )
        if not _index_exists(inspector, mwp_table, op.f('ix_public_micro_workbook_problem_problem_id')):
            op.create_index(
                op.f('ix_public_micro_workbook_problem_problem_id'),
                mwp_table,
                ['problem_id'],
                unique=False,
            )

    inspector = Inspector.from_engine(bind)
    if _table_exists(bind, 'micro_workbook') and _column_exists(inspector, 'micro_workbook', 'is_public'):
        op.alter_column(
            'micro_workbook',
            'is_public',
            existing_type=sa.BOOLEAN(),
            nullable=False,
            existing_server_default=sa.text('false'),
        )

    inspector = Inspector.from_engine(bind)
    table_name = 'micro_problem_code'
    if _table_exists(bind, table_name):
        for index_name in (
            op.f('ix_public_micro_problem_code_user_id'),
            op.f('ix_public_micro_problem_code_problem_id'),
            op.f('ix_public_micro_problem_code_id'),
        ):
            if _index_exists(inspector, table_name, index_name):
                op.drop_index(index_name, table_name=table_name, schema='public')
        op.drop_table(table_name, schema='public')
