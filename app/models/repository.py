from datetime import datetime, timezone
from sqlmodel import Field, Relationship, SQLModel
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.analysis_job import AnalysisJob



class Repository(SQLModel, table=True):
    __tablename__ = "repositories"

    id: int | None = Field(default=None, primary_key=True)

    # 1. Foreign Key constraint: refers to "<table_name>.<column_name>"
    user_id: int = Field(foreign_key="users.id", index=True, ondelete="CASCADE")

    github_repo_id: int = Field(index=True)
    full_name: str  # e.g., "octocat/hello-world"
    clone_url: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # 2. Relationship link back to User
    user: "User" = Relationship(back_populates="repositories")
    analysis_jobs: list["AnalysisJob"] = Relationship(
        back_populates="repository", passive_deletes="all"
    )
