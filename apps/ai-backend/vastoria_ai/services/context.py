from datetime import datetime, timezone

from vastoria_ai.config import get_settings
from vastoria_ai.schemas.context import ContextSnapshot, ContextUpdateRequest


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 20] + "\n… [truncated]"


class ContextService:
    """In-memory context store with optional DB persistence via repository."""

    def __init__(self) -> None:
        self._memory: dict[str, ContextSnapshot] = {}

    def update(self, req: ContextUpdateRequest) -> ContextSnapshot:
        settings = get_settings()
        open_files = req.open_files[: settings.max_context_files]
        trimmed_files = []
        for f in open_files:
            trimmed_files.append(
                f.model_copy(
                    update={
                        "content": _truncate(
                            f.content, settings.max_context_chars_per_file
                        )
                    }
                )
            )

        terminal = req.terminal_output
        if terminal:
            terminal = _truncate(terminal, settings.max_terminal_context_chars)

        snap = ContextSnapshot(
            project_id=req.project_id,
            cwd=req.cwd,
            open_files=trimmed_files,
            active_file=req.active_file,
            workspace_summary=req.workspace_summary,
            terminal_output=terminal,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        self._memory[req.project_id] = snap
        return snap

    def get(self, project_id: str) -> ContextSnapshot | None:
        return self._memory.get(project_id)

    def build_context_block(self, project_id: str) -> str:
        snap = self.get(project_id)
        if not snap:
            return ""

        parts: list[str] = ["## Workspace context"]

        if snap.cwd:
            parts.append(f"**Working directory:** `{snap.cwd}`")

        if snap.workspace_summary:
            parts.append(f"**Summary:** {snap.workspace_summary}")

        if snap.active_file:
            sel = ""
            if snap.active_file.selection:
                sel = f"\nSelection:\n```\n{snap.active_file.selection}\n```"
            parts.append(f"**Active file:** `{snap.active_file.path}`{sel}")

        if snap.open_files:
            parts.append("**Open files:**")
            for f in snap.open_files:
                lang = f.language or "text"
                parts.append(
                    f"\n### `{f.path}`\n```{lang}\n{f.content}\n```"
                )

        if snap.terminal_output:
            parts.append(
                f"**Recent terminal output:**\n```\n{snap.terminal_output}\n```"
            )

        return "\n\n".join(parts)


context_service = ContextService()
