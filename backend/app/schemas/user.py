from typing import Annotated

from pydantic import EmailStr, StringConstraints, field_validator
from sqlmodel import SQLModel

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Password = Annotated[str, StringConstraints(min_length=8)]


class UserBase(SQLModel):
    full_name: Name
    email: EmailStr


class UserCreate(UserBase):
    password: Password

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class UserUpdate(SQLModel):
    full_name: Name | None = None
    email: EmailStr | None = None
    password: Password | None = None

    @field_validator("full_name", "email", "password")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Field cannot be null")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return UserCreate.validate_password(value)


class UserPublic(UserBase):
    id: int


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"
