from fastapi import APIRouter

from vastoria_ai.services.ollama import ollama_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    ollama_ok = await ollama_client.is_reachable()
    return {
        "status": "ok" if ollama_ok else "degraded",
        "ollama": "ok" if ollama_ok else "unreachable",
    }
