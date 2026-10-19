import uuid
from datetime import UTC, datetime

from app.core.errors import ServiceError
from app.models import AnalysisJob, JobStatus
from app.repositories import AnalysisJobRepository
from app.schemas.analysis_job import AnalysisJobCreate, AnalysisJobUpdate
from app.services.repository_service import RepositoryService


class AnalysisJobService:
    def __init__(self, repository: AnalysisJobRepository, repositories: RepositoryService):
        self.repository = repository
        self.repositories = repositories

    async def create(self, user_id: int, repo_id: int, data: AnalysisJobCreate) -> AnalysisJob:
        await self.repositories.get(user_id, repo_id)
        return await self.repository.save(
            AnalysisJob(repository_id=repo_id, **data.model_dump())
        )

    async def get(self, user_id: int, job_id: uuid.UUID) -> AnalysisJob:
        job = await self.repository.get_for_user(job_id, user_id)
        if job is None:
            raise ServiceError(404, "Analysis job not found")
        return job

    async def list(self, user_id: int, repo_id: int, offset: int, limit: int) -> list[AnalysisJob]:
        await self.repositories.get(user_id, repo_id)
        return await self.repository.list_for_repository(repo_id, offset, limit)

    async def update(self, user_id: int, job_id: uuid.UUID, data: AnalysisJobUpdate) -> AnalysisJob:
        job = await self.get(user_id, job_id)
        values = data.model_dump(exclude_unset=True)
        new_status = values.get("status", job.status)
        transitions = {
            JobStatus.QUEUED: {JobStatus.RUNNING, JobStatus.FAILED},
            JobStatus.RUNNING: {JobStatus.COMPLETED, JobStatus.FAILED},
            JobStatus.COMPLETED: set(),
            JobStatus.FAILED: set(),
        }
        if new_status != job.status:
            if new_status not in transitions[job.status]:
                raise ServiceError(409, "Invalid analysis job status transition")
            if new_status in {JobStatus.COMPLETED, JobStatus.FAILED}:
                values["completed_at"] = datetime.now(UTC)
        return await self.repository.update(job, values)

    async def delete(self, user_id: int, job_id: uuid.UUID) -> None:
        await self.repository.delete(await self.get(user_id, job_id))
