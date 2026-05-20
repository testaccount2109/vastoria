import json
import uuid

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from vastoria_ai.schemas.chat import (
    ChatHistoryResponse,
    WsClientMessage,
    WsServerMessage,
)
from vastoria_ai.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/history/{project_id}", response_model=ChatHistoryResponse)
async def chat_history(project_id: str, request: Request) -> ChatHistoryResponse:
    service: ChatService = request.app.state.chat_service
    messages = await service.get_history(project_id)
    return ChatHistoryResponse(project_id=project_id, messages=messages)


@router.post("/abort/{request_id}")
async def abort_chat(request_id: str, request: Request) -> dict:
    service: ChatService = request.app.state.chat_service
    aborted = service.abort(request_id)
    return {"request_id": request_id, "aborted": aborted}


@router.websocket("/stream")
async def chat_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    service: ChatService = websocket.app.state.chat_service

    await websocket.send_json(
        WsServerMessage(
            type="pong",
            request_id="",
            content="connected",
        ).model_dump(exclude_none=True)
    )

    try:
        while True:
            raw = await websocket.receive_text()
            parsed: dict | None = None
            try:
                parsed = json.loads(raw)
                msg = WsClientMessage.model_validate(parsed)
            except (json.JSONDecodeError, ValidationError) as e:
                rid = parsed.get("request_id", "") if isinstance(parsed, dict) else ""
                await websocket.send_json(
                    WsServerMessage(
                        type="error",
                        request_id=rid,
                        error=f"Invalid message: {e}",
                    ).model_dump(exclude_none=True)
                )
                continue

            if msg.type == "ping":
                await websocket.send_json(
                    WsServerMessage(
                        type="pong", request_id=msg.request_id or ""
                    ).model_dump(exclude_none=True)
                )
                continue

            if msg.type == "abort":
                try:
                    abort = msg.parse_abort()
                except ValueError as e:
                    await websocket.send_json(
                        WsServerMessage(
                            type="error",
                            request_id="",
                            error=str(e),
                        ).model_dump(exclude_none=True)
                    )
                    continue

                aborted = service.abort(abort.request_id)
                await websocket.send_json(
                    WsServerMessage(
                        type="aborted" if aborted else "error",
                        request_id=abort.request_id,
                        error=None if aborted else "No active stream for request_id",
                    ).model_dump(exclude_none=True)
                )
                continue

            if msg.type == "chat":
                try:
                    chat = msg.parse_chat()
                except ValueError as e:
                    await websocket.send_json(
                        WsServerMessage(
                            type="error",
                            request_id=msg.request_id or "",
                            error=str(e),
                        ).model_dump(exclude_none=True)
                    )
                    continue

                request_id = chat.request_id

                async for event in service.stream_chat(
                    project_id=chat.project_id,
                    user_message=chat.message,
                    model=chat.model,
                    mode=chat.mode,
                    request_id=request_id,
                ):
                    if websocket.client_state.name != "CONNECTED":
                        service.abort(request_id)
                        break
                    await websocket.send_json(event.model_dump(exclude_none=True))
                continue

    except WebSocketDisconnect:
        pass
