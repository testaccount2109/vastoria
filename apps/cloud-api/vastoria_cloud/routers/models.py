from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.api.deps import get_db
from vastoria_cloud.schemas.models import ModelListResponse, ModelMetadata
from vastoria_cloud.services.model_catalog import ModelCatalogService

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=ModelListResponse)
async def list_models(
    session: AsyncSession = Depends(get_db),
    tag: str | None = Query(
        None,
        description="Performance tag: coding, design, or reasoning",
    ),
    min_score: int = Query(0, ge=0, le=10),
    active_only: bool = Query(True),
) -> ModelListResponse:
    """Model metadata catalog for IDE picker — no inference on this service."""
    if tag and tag not in ("coding", "design", "reasoning"):
        raise HTTPException(
            status_code=400,
            detail="tag must be one of: coding, design, reasoning",
        )
    return await ModelCatalogService(session).list_models(
        tag=tag,
        min_score=min_score,
        active_only=active_only,
    )


@router.get("/{model_id}", response_model=ModelMetadata)
async def get_model(
    model_id: str,
    session: AsyncSession = Depends(get_db),
) -> ModelMetadata:
    model = await ModelCatalogService(session).get_model(model_id)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return model
