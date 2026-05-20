from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from vastoria_cloud import __version__
from vastoria_cloud.config import get_settings
from vastoria_cloud.db import session as db_session
from vastoria_cloud.db.seed import seed_releases_if_empty
from vastoria_cloud.routers import downloads, health, public_files, releases, sync, updates


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_session.init_db()
    app.state.session_factory = db_session.SessionLocal

    settings = get_settings()
    if db_session.SessionLocal and settings.seed_releases_on_startup:
        async with db_session.SessionLocal() as session:
            await seed_releases_if_empty(session)

    yield
    await db_session.close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Vastoria Cloud",
        description=(
            "Vastoria cloud backend — releases, downloads, update checks, and "
            "optional project sync. AI-free: no models, agents, or inference."
        ),
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
    app.include_router(public_files.router)
    app.include_router(releases.router)
    app.include_router(downloads.router)
    app.include_router(sync.router)
    app.include_router(updates.router)

    @app.get("/")
    async def root() -> dict:
        return {
            "service": "vastoria-cloud",
            "version": __version__,
            "docs": "/docs",
            "auth": "stub",
        }

    return app


app = create_app()


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "vastoria_cloud.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    run()
