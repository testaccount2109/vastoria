from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from vastoria_ai import __version__
from vastoria_ai.config import get_settings
from vastoria_ai.db.session import SessionLocal, close_db, init_db
from vastoria_ai.routers import chat, context, health, models
from vastoria_ai.services.chat import ChatService


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    app.state.session_factory = SessionLocal
    app.state.chat_service = ChatService(session_factory=SessionLocal)
    yield
    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Vastoria AI",
        description="Local Ollama-backed AI backend for the Vastoria IDE",
        version=__version__,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=(
            settings.cors_origins + ["*"] if settings.debug else settings.cors_origins
        ),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(models.router)
    app.include_router(context.router)
    app.include_router(chat.router)

    @app.get("/")
    async def root() -> dict:
        return {
            "service": "vastoria-ai",
            "version": __version__,
            "docs": "/docs",
            "websocket": "/chat/stream",
        }

    return app


app = create_app()


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "vastoria_ai.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    run()
