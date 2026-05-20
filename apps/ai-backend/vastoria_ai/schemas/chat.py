from typing import Any, Literal

from pydantic import BaseModel, Field

from vastoria_ai.schemas.modes import AIMode


class ChatMessageRecord(BaseModel):
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: str | None = None


class ChatStreamRequest(BaseModel):
    """Optional REST body mirror of WebSocket chat payload."""

    project_id: str
    message: str
    model: str | None = None
    mode: AIMode = AIMode.CODING
    request_id: str | None = None


class ChatHistoryResponse(BaseModel):
    project_id: str
    messages: list[ChatMessageRecord]


class WsChatPayload(BaseModel):
    project_id: str
    message: str
    model: str | None = None
    mode: AIMode = AIMode.CODING
    request_id: str


class WsAbortPayload(BaseModel):
    request_id: str


class WsClientMessage(BaseModel):
    type: Literal["chat", "abort", "ping"]
    request_id: str | None = None
    payload: dict[str, Any] | None = None

    def parse_chat(self) -> WsChatPayload:
        if self.type != "chat" or not self.payload:
            raise ValueError("Invalid chat message")
        rid = self.request_id or self.payload.get("request_id")
        if not rid:
            raise ValueError("request_id required for chat")
        return WsChatPayload.model_validate({**self.payload, "request_id": rid})

    def parse_abort(self) -> WsAbortPayload:
        rid = self.request_id or (self.payload or {}).get("request_id")
        if not rid:
            raise ValueError("request_id required for abort")
        return WsAbortPayload(request_id=rid)


class WsServerMessage(BaseModel):
    type: Literal["token", "done", "error", "pong", "aborted"]
    request_id: str
    delta: str | None = None
    message_id: str | None = None
    content: str | None = None
    error: str | None = None
