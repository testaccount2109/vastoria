from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    name: str
    model: str
    size: int | None = None
    modified_at: str | None = Field(default=None, alias="modifiedAt")
    family: str | None = None
    parameter_size: str | None = Field(default=None, alias="parameterSize")
    quantization: str | None = None
    digest: str | None = None
    details: dict | None = None

    model_config = {"populate_by_name": True}


class ModelsResponse(BaseModel):
    models: list[ModelInfo]
    default_model: str
    ollama_reachable: bool
