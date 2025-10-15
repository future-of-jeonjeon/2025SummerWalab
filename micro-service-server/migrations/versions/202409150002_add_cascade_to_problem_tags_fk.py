"""add cascade to problem tag association

Revision ID: 202409150002
Revises: 202409150001
Create Date: 2024-09-15 01:15:00.000000
"""

from alembic import op
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "202409150002"
down_revision = "202409150001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = Inspector.from_engine(connection)
    tables = inspector.get_table_names(schema="public")
    if "problem_tags" not in tables:
        return
    op.drop_constraint(
        "problem_tags_problem_id_866ecb8d_fk_problem_id",
        "problem_tags",
        type_="foreignkey",
        schema="public",
    )
    op.drop_constraint(
        "problem_tags_problemtag_id_72d20571_fk_problem_tag_id",
        "problem_tags",
        type_="foreignkey",
        schema="public",
    )
    op.create_foreign_key(
        "problem_tags_problem_id_fkey",
        "problem_tags",
        "problem",
        ["problem_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "problem_tags_problemtag_id_fkey",
        "problem_tags",
        "problem_tag",
        ["problemtag_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )


def downgrade() -> None:
    connection = op.get_bind()
    inspector = Inspector.from_engine(connection)
    tables = inspector.get_table_names(schema="public")
    if "problem_tags" not in tables:
        return
    op.drop_constraint(
        "problem_tags_problem_id_fkey",
        "problem_tags",
        type_="foreignkey",
        schema="public",
    )
    op.drop_constraint(
        "problem_tags_problemtag_id_fkey",
        "problem_tags",
        type_="foreignkey",
        schema="public",
    )
    op.create_foreign_key(
        "problem_tags_problem_id_fkey",
        "problem_tags",
        "problem",
        ["problem_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "problem_tags_problemtag_id_fkey",
        "problem_tags",
        "problem_tag",
        ["problemtag_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )
