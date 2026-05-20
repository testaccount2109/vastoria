from vastoria_ai.schemas.context import ContextUpdateRequest, OpenFileContext
from vastoria_ai.services.context import ContextService


def test_context_build_block():
    svc = ContextService()
    svc.update(
        ContextUpdateRequest(
            project_id="/proj",
            cwd="/proj",
            open_files=[
                OpenFileContext(path="/proj/a.ts", content="const x = 1", language="typescript")
            ],
            terminal_output="npm test\nOK",
        )
    )
    block = svc.build_context_block("/proj")
    assert "/proj/a.ts" in block
    assert "npm test" in block
