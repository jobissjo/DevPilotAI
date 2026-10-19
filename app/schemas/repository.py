from datetime import datetime
from typing import Annotated

from pydantic import HttpUrl, StringConstraints, field_validator
from sqlmodel import Field, SQLModel

RepositoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class RepositoryCreate(SQLModel):
    github_repo_id: int = Field(gt=0)
    full_name: RepositoryName
    clone_url: HttpUrl


class RepositoryUpdate(SQLModel):
    github_repo_id: int | None = Field(default=None, gt=0)
    full_name: RepositoryName | None = None
    clone_url: HttpUrl | None = None

    @field_validator("github_repo_id", "full_name", "clone_url")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Field cannot be null")
        return value


class RepositoryPublic(SQLModel):
    id: int
    user_id: int
    github_repo_id: int
    full_name: str
    clone_url: str
    created_at: datetime
