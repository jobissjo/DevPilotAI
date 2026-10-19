from app.core.errors import ServiceError
from app.core.security import get_hash_password
from app.models import User
from app.repositories import UserRepository
from app.repositories.base import RepositoryConflict
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def create(self, data: UserCreate) -> User:
        if await self.repository.get_by_email(str(data.email)):
            raise ServiceError(400, "Email already registered")
        user = User(full_name=data.full_name, email=str(data.email),
                    password=await get_hash_password(data.password))
        try:
            return await self.repository.save(user)
        except RepositoryConflict as exc:
            raise ServiceError(400, "Email already registered") from exc

    async def get(self, user_id: int) -> User:
        user = await self.repository.get_by_id(user_id)
        if user is None:
            raise ServiceError(404, "User not found")
        return user

    async def update(self, user_id: int, data: UserUpdate) -> User:
        user = await self.get(user_id)
        values = data.model_dump(exclude_unset=True)
        if "email" in values:
            existing = await self.repository.get_by_email(str(values["email"]))
            if existing is not None and existing.id != user_id:
                raise ServiceError(400, "Email already registered")
        if "password" in values:
            values["password"] = await get_hash_password(values["password"])
        try:
            return await self.repository.update(user, values)
        except RepositoryConflict as exc:
            raise ServiceError(400, "Email already registered") from exc

    async def delete(self, user_id: int) -> None:
        await self.repository.delete(await self.get(user_id))
