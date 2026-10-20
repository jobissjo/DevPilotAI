import asyncio
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.celery_app import celery_app
from app.core.config import settings
from app.models import AnalysisJob, JobStatus, Repository
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from app.services.core_loader import load_source_documents
from app.services.code_chunker import chunk_documents


async def _analyze_repository(job_id: uuid.UUID) -> None:
    engine = create_async_engine(settings.DATABASE_URL)

    try:
        async with AsyncSession(engine) as session:
            job = await session.get(AnalysisJob, job_id)
            if job is None or job.status != JobStatus.QUEUED:
                return

            repository = await session.get(Repository, job.repository_id)
            if repository is None:
                return

            clone_url = repository.clone_url
            job.status = JobStatus.RUNNING
            session.add(job)
            await session.commit()

        try:
            with tempfile.TemporaryDirectory(prefix="devpilot-repo-") as directory:
                repo_path = Path(directory) / "repository"
                command = ["git", "clone", "--depth", "1", clone_url, str(repo_path)]
                process = await asyncio.create_subprocess_exec(
                    *command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                try:
                    _, stderr = await asyncio.wait_for(
                        process.communicate(), timeout=120
                    )
                except asyncio.TimeoutError:
                    process.kill()
                    await process.communicate()
                    raise

                if process.returncode != 0:
                    raise RuntimeError(
                        f"git clone failed with exit code {process.returncode}: "
                        f"{stderr.decode(errors='replace')}"
                    )

                documents = list(load_source_documents(repo_path))
                chunks = chunk_documents(documents)

                findings = {
                    "source_file_count": len(documents),
                    "source_chunk_count": len(chunks),
                    "total_source_lines": sum(
                        document.metadata["end_line"] for document in documents
                    ),
                }
                # Embed and store the chunks here before the temporary clone is removed.

            async with AsyncSession(engine) as session:
                job = await session.get(AnalysisJob, job_id)
                if job is not None:
                    job.status = JobStatus.COMPLETED
                    job.findings_summary = findings
                    job.completed_at = datetime.now(UTC)
                    session.add(job)
                    await session.commit()

        except Exception as exc:
            async with AsyncSession(engine) as session:
                job = await session.get(AnalysisJob, job_id)
                if job is not None:
                    job.status = JobStatus.FAILED
                    job.error_message = str(exc)[:1000]
                    job.completed_at = datetime.now(UTC)
                    session.add(job)
                    await session.commit()
            raise
    finally:
        await engine.dispose()


@celery_app.task(name="devpilotai.analyze_repository")
def analyze_repository(job_id: str) -> None:
    asyncio.run(_analyze_repository(uuid.UUID(job_id)))
