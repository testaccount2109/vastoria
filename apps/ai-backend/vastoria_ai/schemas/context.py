from pydantic import BaseModel, Field


class OpenFileContext(BaseModel):
    path: str
    content: str
    language: str | None = None


class ActiveFileContext(BaseModel):
    path: str
    selection: str | None = None


class ContextSnapshot(BaseModel):
    project_id: str
    cwd: str = ""
    open_files: list[OpenFileContext] = Field(default_factory=list)
    active_file: ActiveFileContext | None = None
    workspace_summary: str | None = None
    terminal_output: str | None = None
    updated_at: str | None = None


class ContextUpdateRequest(BaseModel):
    project_id: str
    cwd: str = ""
    open_files: list[OpenFileContext] = Field(default_factory=list)
    active_file: ActiveFileContext | None = None
    workspace_summary: str | None = None
    terminal_output: str | None = None
