import uuid

from sqlmodel import select
from app.models import AnalysisJob, Repository
from app.repositories.base import BaseRepository


class AnalysisJobRepository(BaseRepository[AnalysisJob]):
    async def get_for_user(self, job_id: uuid.UUID, user_id: int) -> AnalysisJob | None:
        result = await self.session.exec(
            select(AnalysisJob).join(Repository)
            .where(AnalysisJob.id == job_id, Repository.user_id == user_id)
        )
        return result.first()

    async def list_for_repository(self, repo_id: int, offset: int, limit: int) -> list[AnalysisJob]:
        result = await self.session.exec(
            select(AnalysisJob).where(AnalysisJob.repository_id == repo_id)
            .order_by(AnalysisJob.created_at, AnalysisJob.id).offset(offset).limit(limit)
        )
        return list(result.all())
