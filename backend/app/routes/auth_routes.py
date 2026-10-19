from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.dependencies import Auth, CurrentUser, Users
from app.schemas import Token, UserCreate, UserPublic

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=201)
async def register_user(user_in: UserCreate, service: Users):
    return await service.create(user_in)


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], service: Auth,
):
    return await service.login(form_data.username, form_data.password)


@router.get("/users/me", response_model=UserPublic)
async def read_users_me(current_user: CurrentUser, service: Users):
    return await service.get(current_user.id)
