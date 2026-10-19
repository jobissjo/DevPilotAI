from typing import Annotated

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, Repositories
from app.schemas.repository import RepositoryCreate, RepositoryPublic, RepositoryUpdate

router = APIRouter(tags=["repositories"])


@router.post("", response_model=RepositoryPublic, status_code=201)
async def create_repository(data: RepositoryCreate, current_user: CurrentUser, service: Repositories):
    return await service.create(current_user.id, data)


@router.get("", response_model=list[RepositoryPublic])
async def list_repositories(
    current_user: CurrentUser, service: Repositories,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return await service.list(current_user.id, offset, limit)


@router.get("/{repo_id}", response_model=RepositoryPublic)
async def read_repository(repo_id: int, current_user: CurrentUser, service: Repositories):
    return await service.get(current_user.id, repo_id)


@router.patch("/{repo_id}", response_model=RepositoryPublic)
async def update_repository(
    repo_id: int, data: RepositoryUpdate, current_user: CurrentUser, service: Repositories,
):
    return await service.update(current_user.id, repo_id, data)


@router.delete("/{repo_id}", status_code=204)
async def delete_repository(repo_id: int, current_user: CurrentUser, service: Repositories):
    return await service.delete(current_user.id, repo_id)
