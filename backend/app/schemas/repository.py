from datetime import datetime
from typing import Annotated

from pydantic import HttpUrl, StringConstraints, field_validator
from sqlmodel import Field, SQLModel

RepositoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class RepositoryCreate(SQLModel):
    full_name: RepositoryName
    clone_url: HttpUrl


class RepositoryUpdate(SQLModel):
    full_name: RepositoryName | None = None
    clone_url: HttpUrl | None = None

    @field_validator("full_name", "clone_url")
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
