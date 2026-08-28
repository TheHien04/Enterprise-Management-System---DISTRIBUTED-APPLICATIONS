from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


async def create_tables(engine: AsyncEngine, base) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(base.metadata.create_all)


async def ensure_columns(engine: AsyncEngine, migrations: list[tuple[str, str]]) -> None:
    """Idempotent ADD COLUMN IF NOT EXISTS for demo deployments without Alembic."""
    async with engine.begin() as conn:
        for table, column_def in migrations:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column_def}"))
