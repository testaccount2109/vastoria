from vastoria_ai.schemas.modes import AIMode
from vastoria_ai.services.modes import system_prompt_for_mode


def test_coding_mode_prompt():
    p = system_prompt_for_mode(AIMode.CODING)
    assert "Coding Mode" in p
    assert "code fences" in p.lower() or "fences" in p.lower()


def test_designing_mode_prompt():
    p = system_prompt_for_mode(AIMode.DESIGNING)
    assert "Designing Mode" in p
