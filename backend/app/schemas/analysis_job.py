import uuid
from datetime import datetime
from typing import Any

from pydantic import field_validator
from sqlmodel import SQLModel

from app.models.enums import JobStatus


class AnalysisJobCreate(SQLModel):
    pass


class AnalysisJobUpdate(SQLModel):
    status: JobStatus | None = None
    commit_sha: str | None = None
    findings_summary: dict[str, Any] | None = None
    error_message: str | None = None

    @field_validator("status")
    @classmethod
    def reject_null_status(cls, value):
        if value is None:
            raise ValueError("Status cannot be null")
        return value


class AnalysisJobPublic(SQLModel):
    id: uuid.UUID
    repository_id: int
    status: JobStatus
    commit_sha: str | None
    findings_summary: dict[str, Any] | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None
