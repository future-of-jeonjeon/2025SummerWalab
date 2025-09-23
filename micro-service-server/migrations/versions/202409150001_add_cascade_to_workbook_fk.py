"""add cascade to workbook FK

Revision ID: 202409150001
Revises: None
Create Date: 2024-09-15 00:01:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "202409150001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "micro_workbook_problem_workbook_id_fkey",
        "micro_workbook_problem",
        type_="foreignkey",
        schema="public",
    )
    op.create_foreign_key(
        "micro_workbook_problem_workbook_id_fkey",
        "micro_workbook_problem",
        "micro_workbook",
        ["workbook_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "micro_workbook_problem_workbook_id_fkey",
        "micro_workbook_problem",
        type_="foreignkey",
        schema="public",
    )
    op.create_foreign_key(
        "micro_workbook_problem_workbook_id_fkey",
        "micro_workbook_problem",
        "micro_workbook",
        ["workbook_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )
