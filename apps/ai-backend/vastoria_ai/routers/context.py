from fastapi import APIRouter, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from vastoria_ai.db.repository import ChatRepository
from vastoria_ai.schemas.context import ContextSnapshot, ContextUpdateRequest
from vastoria_ai.services.context import context_service

router = APIRouter(prefix="/context", tags=["context"])


def get_session_factory(
    request: Request,
) -> async_sessionmaker[AsyncSession] | None:
    return getattr(request.app.state, "session_factory", None)


@router.post("/update", response_model=ContextSnapshot)
async def update_context(
    body: ContextUpdateRequest,
    request: Request,
) -> ContextSnapshot:
    snapshot = context_service.update(body)

    session_factory = get_session_factory(request)
    if session_factory:
        async with session_factory() as session:
            repo = ChatRepository(session)
            await repo.upsert_context(snapshot)

    return snapshot


@router.get("/{project_id}", response_model=ContextSnapshot | None)
async def get_context(project_id: str, request: Request) -> ContextSnapshot | None:
    snap = context_service.get(project_id)
    if snap:
        return snap

    session_factory = get_session_factory(request)
    if session_factory:
        async with session_factory() as session:
            repo = ChatRepository(session)
            return await repo.get_context(project_id)

    return None
