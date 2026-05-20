from pathlib import Path

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from vastoria_cloud.config import get_settings
from vastoria_cloud.db.models import Base

engine: AsyncEngine | None = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None


def build_database_url() -> str:
    settings = get_settings()
    if settings.database_url:
        url = settings.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    path = Path(settings.sqlite_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite+aiosqlite:///{path.resolve()}"


async def init_db() -> None:
    global engine, SessionLocal
    engine = create_async_engine(build_database_url(), echo=get_settings().debug)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    global engine, SessionLocal
    if engine:
        await engine.dispose()
    engine = None
    SessionLocal = None
