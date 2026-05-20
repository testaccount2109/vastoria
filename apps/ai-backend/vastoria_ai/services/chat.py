from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import datetime, timezone
from typing import TypeVar

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from vastoria_ai.db.repository import ChatRepository
from vastoria_ai.schemas.chat import ChatMessageRecord, WsServerMessage
from vastoria_ai.schemas.modes import AIMode
from vastoria_ai.services.context import context_service
from vastoria_ai.services.modes import system_prompt_for_mode
from vastoria_ai.services.ollama import OllamaError, ollama_client
from vastoria_ai.services.stream_manager import stream_manager

T = TypeVar("T")


class ChatService:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
    ) -> None:
        self._session_factory = session_factory

    async def _with_repo(
        self, fn: Callable[[ChatRepository | None], Awaitable[T]]
    ) -> T:
        if not self._session_factory:
            return await fn(None)
        async with self._session_factory() as session:
            return await fn(ChatRepository(session))

    async def get_history(self, project_id: str) -> list[ChatMessageRecord]:
        async def run(repo: ChatRepository | None):
            if repo:
                return await repo.list_messages(project_id)
            return []

        return await self._with_repo(run)

    def _build_messages(
        self,
        *,
        mode: AIMode,
        project_id: str,
        history: list[ChatMessageRecord],
        user_message: str,
    ) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt_for_mode(mode)},
        ]

        context_block = context_service.build_context_block(project_id)
        if context_block:
            messages.append({"role": "system", "content": context_block})

        for msg in history[-40:]:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": user_message})
        return messages

    async def stream_chat(
        self,
        *,
        project_id: str,
        user_message: str,
        model: str | None,
        mode: AIMode,
        request_id: str,
    ) -> AsyncIterator[WsServerMessage]:
        active = stream_manager.register(request_id)
        history = await self.get_history(project_id)
        resolved_model = await ollama_client.resolve_model(model)
        ollama_messages = self._build_messages(
            mode=mode,
            project_id=project_id,
            history=history,
            user_message=user_message,
        )

        user_record = ChatMessageRecord(
            id=str(uuid.uuid4()),
            role="user",
            content=user_message,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        async def save_user(repo: ChatRepository | None):
            if repo:
                await repo.append_message(project_id, user_record)

        await self._with_repo(save_user)

        assistant_id = str(uuid.uuid4())
        full_content: list[str] = []

        try:
            async for delta in ollama_client.chat_stream(
                model=resolved_model,
                messages=ollama_messages,
                cancel_event=active.cancel_event,
            ):
                if active.cancel_event.is_set():
                    yield WsServerMessage(
                        type="aborted",
                        request_id=request_id,
                        message_id=assistant_id,
                    )
                    return
                full_content.append(delta)
                yield WsServerMessage(
                    type="token",
                    request_id=request_id,
                    delta=delta,
                    message_id=assistant_id,
                )

            if active.cancel_event.is_set():
                yield WsServerMessage(
                    type="aborted",
                    request_id=request_id,
                    message_id=assistant_id,
                )
                return

            content = "".join(full_content)
            assistant_record = ChatMessageRecord(
                id=assistant_id,
                role="assistant",
                content=content,
                created_at=datetime.now(timezone.utc).isoformat(),
            )

            async def save_assistant(repo: ChatRepository | None):
                if repo:
                    await repo.append_message(project_id, assistant_record)

            await self._with_repo(save_assistant)

            yield WsServerMessage(
                type="done",
                request_id=request_id,
                message_id=assistant_id,
                content=content,
            )
        except asyncio.CancelledError:
            yield WsServerMessage(
                type="aborted",
                request_id=request_id,
                message_id=assistant_id,
            )
        except OllamaError as e:
            yield WsServerMessage(
                type="error",
                request_id=request_id,
                error=str(e),
            )
        finally:
            stream_manager.remove(request_id)

    def abort(self, request_id: str) -> bool:
        return stream_manager.abort(request_id)
