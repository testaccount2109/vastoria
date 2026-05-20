from collections.abc import AsyncGenerator

from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from vastoria_cloud.db import session as db_session


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    factory: async_sessionmaker[AsyncSession] | None = getattr(
        request.app.state, "session_factory", None
    )
    if factory is None:
        factory = db_session.SessionLocal
    if factory is None:
        raise HTTPException(status_code=503, detail="Database not initialized")
    async with factory() as session:
        yield session
