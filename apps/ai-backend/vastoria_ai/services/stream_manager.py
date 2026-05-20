from __future__ import annotations

import asyncio
from dataclasses import dataclass, field


@dataclass
class ActiveStream:
    request_id: str
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)
    task: asyncio.Task | None = None


class StreamManager:
    """Tracks in-flight streaming requests for abort support."""

    def __init__(self) -> None:
        self._streams: dict[str, ActiveStream] = {}

    def register(self, request_id: str) -> ActiveStream:
        stream = ActiveStream(request_id=request_id)
        self._streams[request_id] = stream
        return stream

    def get(self, request_id: str) -> ActiveStream | None:
        return self._streams.get(request_id)

    def abort(self, request_id: str) -> bool:
        stream = self._streams.get(request_id)
        if not stream:
            return False
        stream.cancel_event.set()
        if stream.task and not stream.task.done():
            stream.task.cancel()
        return True

    def remove(self, request_id: str) -> None:
        self._streams.pop(request_id, None)


stream_manager = StreamManager()
