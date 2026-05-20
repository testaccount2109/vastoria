import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.db.models import ModelMetadataRow
from vastoria_cloud.schemas.models import ModelListResponse, ModelMetadata, ModelPerformanceTags


def _catalog_path() -> Path:
    return Path(__file__).resolve().parent.parent / "data" / "model_catalog.json"


class ModelCatalogService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _row_to_model(self, row: ModelMetadataRow) -> ModelMetadata:
        tags_data = json.loads(row.tags_json or "{}")
        return ModelMetadata(
            model_id=row.model_id,
            name=row.name,
            provider=row.provider,
            family=row.family,
            parameter_size=row.parameter_size,
            context_length=row.context_length,
            description=row.description,
            tags=ModelPerformanceTags.model_validate(tags_data),
            is_active=row.is_active,
        )

    async def list_models(
        self,
        *,
        tag: str | None = None,
        min_score: int = 0,
        active_only: bool = True,
    ) -> ModelListResponse:
        stmt = select(ModelMetadataRow).order_by(ModelMetadataRow.name)
        if active_only:
            stmt = stmt.where(ModelMetadataRow.is_active.is_(True))
        rows = (await self._session.scalars(stmt)).all()
        models = [self._row_to_model(r) for r in rows]

        if tag:
            tag = tag.lower()
            filtered: list[ModelMetadata] = []
            for m in models:
                score = getattr(m.tags, tag, None)
                if score is not None and score >= min_score:
                    filtered.append(m)
            models = filtered

        return ModelListResponse(models=models, total=len(models))

    async def get_model(self, model_id: str) -> ModelMetadata | None:
        row = await self._session.scalar(
            select(ModelMetadataRow).where(ModelMetadataRow.model_id == model_id)
        )
        return self._row_to_model(row) if row else None

    async def seed_from_file(self) -> int:
        raw = json.loads(_catalog_path().read_text(encoding="utf-8"))
        count = 0
        for item in raw:
            existing = await self._session.scalar(
                select(ModelMetadataRow).where(
                    ModelMetadataRow.model_id == item["model_id"]
                )
            )
            tags = item.get("tags", {})
            if existing:
                continue
            row = ModelMetadataRow(
                model_id=item["model_id"],
                name=item["name"],
                provider=item.get("provider", "ollama"),
                family=item.get("family"),
                parameter_size=item.get("parameter_size"),
                context_length=item.get("context_length"),
                description=item.get("description", ""),
                tags_json=json.dumps(tags),
                is_active=item.get("is_active", True),
            )
            self._session.add(row)
            count += 1
        if count:
            await self._session.commit()
        return count
