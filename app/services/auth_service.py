import jwt

from app.core.config import settings
from app.core.errors import ServiceError
from app.core.security import create_token, verify_password
from app.models import User
from app.repositories import UserRepository
from app.schemas.user import Token


class AuthService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def login(self, email: str, password: str) -> Token:
        user = await self.repository.get_by_email(email)
        if user is None or not await verify_password(password, user.password):
            raise ServiceError(401, "Incorrect email or password")
        token = await create_token({"sub": str(user.id)})
        return Token(access_token=token)

    async def current_user(self, token: str) -> User:
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
                options={"require": ["sub", "exp", "token_type"]},
            )
            if payload["token_type"] != "access":
                raise ValueError("Invalid token type")
            user_id = int(payload["sub"])
            if not 0 < user_id <= 2_147_483_647:
                raise ValueError("Invalid user ID")
        except (jwt.PyJWTError, TypeError, ValueError, OverflowError) as exc:
            raise ServiceError(401, "Could not validate credentials") from exc
        user = await self.repository.get_by_id(user_id)
        if user is None:
            raise ServiceError(401, "Could not validate credentials")
        return user
