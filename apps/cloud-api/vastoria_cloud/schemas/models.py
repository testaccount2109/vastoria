from pydantic import BaseModel, Field


class ModelPerformanceTags(BaseModel):
    coding: int = Field(ge=0, le=10, description="0-10 coding suitability")
    design: int = Field(ge=0, le=10, description="0-10 UI/design suitability")
    reasoning: int = Field(ge=0, le=10, description="0-10 reasoning depth")


class ModelMetadata(BaseModel):
    model_id: str
    name: str
    provider: str = "ollama"
    family: str | None = None
    parameter_size: str | None = None
    context_length: int | None = None
    description: str = ""
    tags: ModelPerformanceTags
    is_active: bool = True


class ModelListResponse(BaseModel):
    models: list[ModelMetadata]
    total: int
