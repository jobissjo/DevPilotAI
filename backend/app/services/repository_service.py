from app.core.errors import ServiceError
from app.models import Repository
from app.repositories import CodeRepoRepository
from app.schemas.repository import RepositoryCreate, RepositoryUpdate


class RepositoryService:
    def __init__(self, repository: CodeRepoRepository):
        self.repository = repository

    async def create(self, user_id: int, data: RepositoryCreate) -> Repository:
        return await self.repository.save(
            Repository(user_id=user_id, **data.model_dump(mode="json"))
        )

    async def get(self, user_id: int, repo_id: int) -> Repository:
        repo = await self.repository.get_for_user(repo_id, user_id)
        if repo is None:
            raise ServiceError(404, "Repository not found")
        return repo

    async def list(self, user_id: int, offset: int, limit: int) -> list[Repository]:
        return await self.repository.list_for_user(user_id, offset, limit)

    async def update(self, user_id: int, repo_id: int, data: RepositoryUpdate) -> Repository:
        repo = await self.get(user_id, repo_id)
        return await self.repository.update(repo, data.model_dump(mode="json", exclude_unset=True))

    async def delete(self, user_id: int, repo_id: int) -> None:
        await self.repository.delete(await self.get(user_id, repo_id))
