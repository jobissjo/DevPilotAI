import re
from urllib.parse import quote, urlsplit

import httpx

from app.core.errors import ServiceError
from app.models import Repository
from app.repositories import CodeRepoRepository
from app.schemas.repository import RepositoryCreate, RepositoryUpdate


class RepositoryService:
    def __init__(self, repository: CodeRepoRepository):
        self.repository = repository

    async def create(self, user_id: int, data: RepositoryCreate) -> Repository:
        github_repo_id = await github_repository_id(data.full_name, str(data.clone_url))
        return await self.repository.save(
            Repository(user_id=user_id, github_repo_id=github_repo_id,
                       **data.model_dump(mode="json"))
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
        values = data.model_dump(mode="json", exclude_unset=True)
        if "full_name" in values or "clone_url" in values:
            values["github_repo_id"] = await github_repository_id(
                values.get("full_name", repo.full_name),
                values.get("clone_url", repo.clone_url),
            )
        return await self.repository.update(repo, values)

    async def delete(self, user_id: int, repo_id: int) -> None:
        await self.repository.delete(await self.get(user_id, repo_id))


async def github_repository_id(full_name: str, clone_url: str) -> int:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", full_name):
        raise ServiceError(422, "Use the owner/repository format")
    parsed = urlsplit(clone_url)
    if (parsed.scheme != "https" or parsed.hostname != "github.com"
            or parsed.username or parsed.password or parsed.port
            or parsed.query or parsed.fragment
            or parsed.path.endswith("/")
            or parsed.path.rstrip("/").removesuffix(".git").lower() != f"/{full_name.lower()}"):
        raise ServiceError(422, f"Clone URL must match https://github.com/{full_name}.git")
    owner, name = full_name.split("/")
    url = f"https://api.github.com/repos/{quote(owner)}/{quote(name)}"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(url, headers={"Accept": "application/vnd.github+json"})
    except httpx.RequestError as exc:
        raise ServiceError(502, "Could not reach GitHub to verify the repository") from exc
    if response.status_code == 404:
        raise ServiceError(404, "GitHub repository not found or is private")
    if response.status_code != 200:
        raise ServiceError(502, "GitHub could not verify the repository")
    try:
        details = response.json()
        repo_id = details["id"]
        canonical_name = details["full_name"]
        if (type(repo_id) is not int or repo_id <= 0
                or canonical_name.lower() != full_name.lower()):
            raise ValueError("Unexpected repository details")
    except (ValueError, KeyError, TypeError, AttributeError) as exc:
        raise ServiceError(502, "GitHub returned invalid repository details") from exc
    return repo_id
