import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

from app.models.enums import JobStatus

if TYPE_CHECKING:
    from app.models.repository import Repository

class AnalysisJob(SQLModel, table=True):
    __tablename__ = "analysis_jobs"

    # UUID primary key prevents guessing job IDs via sequential guessing
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Foreign key referencing repositories.id
    repository_id: int = Field(
        foreign_key="repositories.id", index=True, ondelete="CASCADE"
    )

    status: JobStatus = Field(default=JobStatus.QUEUED, index=True)
    commit_sha: str | None = Field(default=None)

    # JSON column to store arbitrary agent output & structured findings
    findings_summary: dict[str, Any] | None = Field(
        default=None, sa_column=Column(JSON)
    )
    error_message: str | None = Field(default=None)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )
    completed_at: datetime | None = Field(default=None)

    # Relationship back to repository
    repository: "Repository" = Relationship(back_populates="analysis_jobs")
