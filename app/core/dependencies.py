from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.models import User
from app.repositories import AnalysisJobRepository, CodeRepoRepository, UserRepository
from app.services.analysis_job_service import AnalysisJobService
from app.services.auth_service import AuthService
from app.services.repository_service import RepositoryService
from app.services.user_service import UserService

Session = Annotated[AsyncSession, Depends(get_session)]
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def get_user_service(session: Session) -> UserService:
    return UserService(UserRepository(session))


def get_auth_service(session: Session) -> AuthService:
    return AuthService(UserRepository(session))


def get_repository_service(session: Session) -> RepositoryService:
    return RepositoryService(CodeRepoRepository(session))


def get_analysis_job_service(
    session: Session,
    repositories: Annotated[RepositoryService, Depends(get_repository_service)],
) -> AnalysisJobService:
    return AnalysisJobService(AnalysisJobRepository(session), repositories)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    return await service.current_user(token)


CurrentUser = Annotated[User, Depends(get_current_user)]
Users = Annotated[UserService, Depends(get_user_service)]
Auth = Annotated[AuthService, Depends(get_auth_service)]
Repositories = Annotated[RepositoryService, Depends(get_repository_service)]
AnalysisJobs = Annotated[AnalysisJobService, Depends(get_analysis_job_service)]
