from sqlmodel import select

from app.models import Repository
from app.repositories.base import BaseRepository


class CodeRepoRepository(BaseRepository[Repository]):
    async def get_for_user(self, repo_id: int, user_id: int) -> Repository | None:
        result = await self.session.exec(
            select(Repository).where(Repository.id == repo_id, Repository.user_id == user_id)
        )
        return result.first()

    async def list_for_user(self, user_id: int, offset: int, limit: int) -> list[Repository]:
        result = await self.session.exec(
            select(Repository).where(Repository.user_id == user_id)
            .order_by(Repository.id).offset(offset).limit(limit)
        )
        return list(result.all())
