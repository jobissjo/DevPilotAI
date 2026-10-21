import uuid
from datetime import UTC, datetime

from app.core.errors import ServiceError
from app.models import AnalysisJob, JobStatus
from app.repositories import AnalysisJobRepository
from app.schemas.analysis_job import (
    AnalysisJobCreate, AnalysisJobUpdate, QuestionAnswer, QuestionSource,
)
from app.services.repository_service import RepositoryService
from app.services.question_service import answer_from_code
from app.services.vector_store import search_code
from app.core.llm_provider import selected_llm
from app.tasks.analysis import analyze_repository
import asyncio


class AnalysisJobService:
    def __init__(self, repository: AnalysisJobRepository, repositories: RepositoryService):
        self.repository = repository
        self.repositories = repositories

    async def create(self, user_id: int, repo_id: int, data: AnalysisJobCreate) -> AnalysisJob:
        await self.repositories.get(user_id, repo_id)
        job = await self.repository.save(
            AnalysisJob(repository_id=repo_id)
        )
        try:
            await asyncio.to_thread(analyze_repository.delay, str(job.id))
        except Exception as exc:
            await self.repository.update(
                job,
                {
                    "status": JobStatus.FAILED,
                    "error_message": "Could not queue the analysis task",
                    "completed_at": datetime.now(UTC),
                },
            )
            raise ServiceError(503, "Could not queue analysis; check Redis") from exc

        return job
    

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

    async def ask(self, user_id: int, job_id: uuid.UUID, question: str) -> QuestionAnswer:
        job = await self.get(user_id, job_id)
        if job.status != JobStatus.COMPLETED:
            raise ServiceError(409, "Finish indexing this analysis before asking questions")
        try:
            selected_llm()
        except ValueError as exc:
            raise ServiceError(503, str(exc)) from exc
        try:
            matches = await asyncio.to_thread(search_code, str(job_id), question, 8)
        except Exception as exc:
            raise ServiceError(503, "Code search is unavailable") from exc
        if not matches:
            return QuestionAnswer(
                answer="I could not find indexed code for this analysis.", sources=[],
            )
        try:
            answer = await answer_from_code(question, matches)
        except Exception as exc:
            raise ServiceError(502, "The answer model is unavailable") from exc
        return QuestionAnswer(
            answer=answer,
            sources=[QuestionSource(**match) for match in matches],
        )
