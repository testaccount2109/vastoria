from fastapi import APIRouter, HTTPException

from vastoria_ai.config import get_settings
from vastoria_ai.schemas.models import ModelsResponse
from vastoria_ai.services.ollama import OllamaError, ollama_client

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=ModelsResponse)
async def list_models() -> ModelsResponse:
    settings = get_settings()
    reachable = await ollama_client.is_reachable()

    if not reachable:
        return ModelsResponse(
            models=[],
            default_model=settings.ollama_default_model,
            ollama_reachable=False,
        )

    try:
        models = await ollama_client.list_models()
    except OllamaError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    default = settings.ollama_default_model
    if models and default not in {m.name for m in models}:
        default = models[0].name

    return ModelsResponse(
        models=models,
        default_model=default,
        ollama_reachable=True,
    )
