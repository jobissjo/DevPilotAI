import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.dependencies import AnalysisJobs, CurrentUser
from app.schemas.analysis_job import AnalysisJobCreate, AnalysisJobPublic, AnalysisJobUpdate

router = APIRouter(tags=["analysis jobs"])


@router.post("/repositories/{repo_id}/jobs", response_model=AnalysisJobPublic, status_code=201)
async def create_job(
    repo_id: int, data: AnalysisJobCreate, current_user: CurrentUser, service: AnalysisJobs,
):
    return await service.create(current_user.id, repo_id, data)


@router.get("/repositories/{repo_id}/jobs", response_model=list[AnalysisJobPublic])
async def list_jobs(
    repo_id: int, current_user: CurrentUser, service: AnalysisJobs,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return await service.list(current_user.id, repo_id, offset, limit)


@router.get("/jobs/{job_id}", response_model=AnalysisJobPublic)
async def read_job(job_id: uuid.UUID, current_user: CurrentUser, service: AnalysisJobs):
    return await service.get(current_user.id, job_id)


@router.patch("/jobs/{job_id}", response_model=AnalysisJobPublic)
async def update_job(
    job_id: uuid.UUID, data: AnalysisJobUpdate, current_user: CurrentUser, service: AnalysisJobs,
):
    return await service.update(current_user.id, job_id, data)


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: uuid.UUID, current_user: CurrentUser, service: AnalysisJobs):
    return await service.delete(current_user.id, job_id)
