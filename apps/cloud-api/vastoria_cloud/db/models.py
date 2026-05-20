from datetime import datetime
from enum import Enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ArtifactType(str, Enum):
    INSTALLER = "installer"
    PORTABLE = "portable"
    MSI = "msi"


class Platform(str, Enum):
    WINDOWS_X86_64 = "windows_x86_64"


# --- Sync (existing) ---


class ProjectRow(Base):
    __tablename__ = "projects"

    project_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    head_version_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    versions: Mapped[list["SnapshotVersionRow"]] = relationship(back_populates="project")


class SnapshotVersionRow(Base):
    __tablename__ = "snapshot_versions"

    version_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("projects.project_id"), index=True
    )
    parent_version_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tree_json: Mapped[str] = mapped_column(Text)
    manifest_json: Mapped[str] = mapped_column(Text)
    message: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    is_head: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped["ProjectRow"] = relationship(back_populates="versions")
    files: Mapped[list["SnapshotFileRow"]] = relationship(back_populates="version")


class SnapshotFileRow(Base):
    __tablename__ = "snapshot_files"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    version_hash: Mapped[str] = mapped_column(
        String(64), ForeignKey("snapshot_versions.version_hash"), index=True
    )
    path: Mapped[str] = mapped_column(String(1024))
    content_hash: Mapped[str] = mapped_column(String(64))

    version: Mapped["SnapshotVersionRow"] = relationship(back_populates="files")


# --- Releases & downloads ---


class ReleaseRow(Base):
    __tablename__ = "releases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    version: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    changelog: Mapped[str] = mapped_column(Text, default="")
    prerelease: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    recommended: Mapped[bool] = mapped_column(Boolean, default=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    artifacts: Mapped[list["BuildArtifactRow"]] = relationship(
        back_populates="release",
        cascade="all, delete-orphan",
    )


class BuildArtifactRow(Base):
    __tablename__ = "build_artifacts"
    __table_args__ = (
        UniqueConstraint("release_id", "artifact_type", name="uq_release_artifact_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("releases.id"), index=True)
    artifact_type: Mapped[str] = mapped_column(String(32))
    platform: Mapped[str] = mapped_column(String(32), default=Platform.WINDOWS_X86_64.value)
    filename: Mapped[str] = mapped_column(String(512))
    storage_key: Mapped[str] = mapped_column(String(1024), unique=True)
    sha256: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    recommended: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    release: Mapped["ReleaseRow"] = relationship(back_populates="artifacts")


# --- Model metadata (catalog only) ---


class ModelMetadataRow(Base):
    __tablename__ = "model_metadata"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(256))
    provider: Mapped[str] = mapped_column(String(64), default="ollama")
    family: Mapped[str | None] = mapped_column(String(128), nullable=True)
    parameter_size: Mapped[str | None] = mapped_column(String(32), nullable=True)
    context_length: Mapped[int | None] = mapped_column(nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    tags_json: Mapped[str] = mapped_column(Text, default="{}")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
