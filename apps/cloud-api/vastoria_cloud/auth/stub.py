"""Authentication stub — replace with real auth without changing router contracts."""

from dataclasses import dataclass

from fastapi import Header, HTTPException


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    authenticated: bool
    roles: tuple[str, ...] = ()


async def get_optional_user(
    x_vastoria_user: str | None = Header(default=None, alias="X-Vastoria-User"),
) -> AuthContext:
    """Optional identity header for future auth; defaults to anonymous."""
    if x_vastoria_user:
        return AuthContext(user_id=x_vastoria_user, authenticated=False, roles=("user",))
    return AuthContext(user_id="anonymous", authenticated=False)


async def require_admin_stub(
    x_vastoria_admin: str | None = Header(default=None, alias="X-Vastoria-Admin"),
) -> AuthContext:
    """
    Stub admin gate — accepts X-Vastoria-Admin: allow in development.
    Replace with JWT/API key validation before production.
    """
    if x_vastoria_admin == "allow":
        return AuthContext(user_id="stub-admin", authenticated=False, roles=("admin",))
    raise HTTPException(
        status_code=401,
        detail="Admin auth not configured. Send header X-Vastoria-Admin: allow (stub only).",
    )
