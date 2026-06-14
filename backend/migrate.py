"""
Lightweight, idempotent schema migrations.

SQLAlchemy's ``create_all`` creates tables that don't exist yet, but it does NOT
add new columns to tables that already exist. For a small project without
Alembic, this module performs a handful of additive, safe column migrations on
startup so that existing databases (SQLite locally, Postgres in production) pick
up new columns without manual intervention.

Every statement is written to be safe to run repeatedly.
"""
from sqlalchemy import inspect, text

from database import engine


def _column_exists(inspector, table: str, column: str) -> bool:
    try:
        cols = {c["name"] for c in inspector.get_columns(table)}
    except Exception:
        # Table doesn't exist yet — create_all will handle it.
        return True
    return column in cols


def run_migrations() -> None:
    """
    Apply additive column migrations to the fixtures table.

    Adds:
      - fixtures.kickoff_time (TIMESTAMP, nullable)
      - fixtures.status (VARCHAR, default 'scheduled')

    Postgres supports ``ADD COLUMN IF NOT EXISTS``; SQLite does not, so we guard
    with an inspector check and issue a plain ``ADD COLUMN`` only when missing.
    """
    dialect = engine.dialect.name
    inspector = inspect(engine)

    statements: list[str] = []

    if dialect == "postgresql":
        statements.append(
            "ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS kickoff_time TIMESTAMP"
        )
        statements.append(
            "ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'scheduled'"
        )
    else:
        # SQLite (and other dialects without IF NOT EXISTS support)
        if not _column_exists(inspector, "fixtures", "kickoff_time"):
            statements.append("ALTER TABLE fixtures ADD COLUMN kickoff_time TIMESTAMP")
        if not _column_exists(inspector, "fixtures", "status"):
            statements.append(
                "ALTER TABLE fixtures ADD COLUMN status VARCHAR DEFAULT 'scheduled'"
            )

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as exc:
                # Idempotency safety net: ignore "already exists" style errors so a
                # partially-migrated DB doesn't crash startup.
                print(f"⚠️  Migration step skipped ({stmt}): {exc}")
