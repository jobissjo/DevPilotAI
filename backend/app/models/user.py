from datetime import datetime, timezone
from sqlmodel import Field, Relationship, SQLModel

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.repository import Repository

class User(SQLModel, table=True):
    __tablename__ = "users"


    id: int | None = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    password:str


    repositories: list["Repository"] = Relationship(
        back_populates="user", passive_deletes="all"
    )
