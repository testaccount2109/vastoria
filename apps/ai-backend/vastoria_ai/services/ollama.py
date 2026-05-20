from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from vastoria_ai.config import get_settings
from vastoria_ai.schemas.models import ModelInfo


class OllamaError(Exception):
    pass


class OllamaClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    @property
    def base_url(self) -> str:
        return self._settings.ollama_base_url.rstrip("/")

    async def is_reachable(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except httpx.HTTPError:
            return False

    async def list_models(self) -> list[ModelInfo]:
        async with httpx.AsyncClient(
            timeout=self._settings.ollama_request_timeout
        ) as client:
            try:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
            except httpx.HTTPError as e:
                raise OllamaError(f"Failed to list models: {e}") from e

            data = response.json()
            models: list[ModelInfo] = []
            for item in data.get("models", []):
                name = item.get("name") or item.get("model", "")
                details = item.get("details") or {}
                models.append(
                    ModelInfo(
                        name=name,
                        model=name,
                        size=item.get("size"),
                        modified_at=item.get("modified_at"),
                        family=details.get("family"),
                        parameter_size=details.get("parameter_size"),
                        quantization=details.get("quantization_level"),
                        digest=item.get("digest"),
                        details=details,
                    )
                )
            return models

    async def resolve_model(self, requested: str | None) -> str:
        if requested:
            return requested
        models = await self.list_models()
        if models:
            return models[0].name
        return self._settings.ollama_default_model

    async def chat_stream(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        cancel_event: Any | None = None,
    ) -> AsyncIterator[str]:
        """Stream token deltas from Ollama /api/chat."""
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
        }

        async with httpx.AsyncClient(
            timeout=self._settings.ollama_request_timeout
        ) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if cancel_event is not None and cancel_event.is_set():
                            break
                        if not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        message = chunk.get("message") or {}
                        content = message.get("content")
                        if content:
                            yield content

                        if chunk.get("done"):
                            break
            except httpx.HTTPError as e:
                raise OllamaError(f"Ollama chat stream failed: {e}") from e


ollama_client = OllamaClient()
