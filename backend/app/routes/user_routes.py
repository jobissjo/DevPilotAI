from fastapi import APIRouter

from app.core.dependencies import CurrentUser, Users
from app.schemas.user import UserPublic, UserUpdate

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserPublic)
async def read_user(current_user: CurrentUser, service: Users):
    return await service.get(current_user.id)


@router.patch("/me", response_model=UserPublic)
async def update_user(data: UserUpdate, current_user: CurrentUser, service: Users):
    return await service.update(current_user.id, data)


@router.delete("/me", status_code=204)
async def delete_user(current_user: CurrentUser, service: Users):
    return await service.delete(current_user.id)
