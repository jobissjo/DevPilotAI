from sqlmodel import SQLModel
from sqlmodel import Field


class UserBase(SQLModel):
    full_name: str
    email: str


class UserCreate(UserBase):
    password: str

# What the API returns (password is naturally excluded)
class UserPublic(UserBase):
    id: int
    
class Token(SQLModel):
    access_token: str
    token_type: str