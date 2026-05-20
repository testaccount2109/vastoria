from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_ai.db.models import ChatMessageRow, ContextRow
from vastoria_ai.schemas.chat import ChatMessageRecord
from vastoria_ai.schemas.context import ContextSnapshot


class ChatRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_messages(self, project_id: str) -> list[ChatMessageRecord]:
        result = await self._session.execute(
            select(ChatMessageRow)
            .where(ChatMessageRow.project_id == project_id)
            .order_by(ChatMessageRow.created_at.asc())
        )
        rows = result.scalars().all()
        return [
            ChatMessageRecord(
                id=r.id,
                role=r.role,  # type: ignore[arg-type]
                content=r.content,
                created_at=r.created_at.isoformat() if r.created_at else None,
            )
            for r in rows
        ]

    async def append_message(
        self, project_id: str, message: ChatMessageRecord
    ) -> None:
        row = ChatMessageRow(
            id=message.id,
            project_id=project_id,
            role=message.role,
            content=message.content,
        )
        self._session.add(row)
        await self._session.commit()

    async def upsert_context(self, snapshot: ContextSnapshot) -> None:
        payload = snapshot.model_dump_json()
        existing = await self._session.get(ContextRow, snapshot.project_id)
        if existing:
            existing.payload_json = payload
        else:
            self._session.add(
                ContextRow(project_id=snapshot.project_id, payload_json=payload)
            )
        await self._session.commit()

    async def get_context(self, project_id: str) -> ContextSnapshot | None:
        row = await self._session.get(ContextRow, project_id)
        if not row:
            return None
        return ContextSnapshot.model_validate_json(row.payload_json)
