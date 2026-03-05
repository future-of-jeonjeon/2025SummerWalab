"""
Defensive helpers for Alembic migrations.

These utilities handle schema mismatches where constraint names may differ
between environments (e.g., user_id_fkey vs member_id_fkey).
"""
from alembic import op
from sqlalchemy import text, inspect


def drop_constraint_if_exists(
    table_name: str,
    constraint_name: str,
    type_: str = "foreignkey",
    schema: str = "public",
) -> None:
    """
    Drop a constraint only if it exists in the database.

    Uses PostgreSQL's IF EXISTS clause to safely skip if the constraint
    is not present. This prevents migration failures when constraint names
    differ between environments.

    Args:
        table_name: Name of the table containing the constraint.
        constraint_name: Name of the constraint to drop.
        type_: Type of constraint (default: "foreignkey").
        schema: Schema name (default: "public").
    """
    qualified = f'"{schema}"."{table_name}"' if schema else f'"{table_name}"'
    op.execute(
        text(
            f'ALTER TABLE {qualified} DROP CONSTRAINT IF EXISTS "{constraint_name}"'
        )
    )


def drop_fk_referencing_column(
    table_name: str,
    column_name: str,
    schema: str = "public",
) -> None:
    """
    Drop all foreign key constraints that reference a specific column.

    Introspects the database to find the actual FK constraint names on
    the given column, then drops them. This is useful when the constraint
    name is unknown or varies between environments.

    Args:
        table_name: Name of the table.
        column_name: Column name whose FK constraints should be dropped.
        schema: Schema name (default: "public").
    """
    bind = op.get_bind()
    insp = inspect(bind)
    for fk in insp.get_foreign_keys(table_name, schema=schema):
        if column_name in fk["constrained_columns"]:
            constraint = fk["name"]
            if constraint:
                drop_constraint_if_exists(table_name, constraint, schema=schema)
