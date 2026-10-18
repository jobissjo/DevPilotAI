import bcrypt
import asyncio
from datetime import timedelta, datetime, timezone
from typing import Optional
from app.core.config import settings
import jwt


async def get_hash_password(password: str) -> str:
    def hashing(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    return await asyncio.to_thread(hashing, password)


async def verify_password(password: str, hashed_password: str) -> bool:
    def verify(password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

    return await asyncio.to_thread(verify, password, hashed_password)


async def create_token(
    data: dict, expires_delta: Optional[timedelta] = None,
    token_type:str = 'access',
):
    to_encode = data.copy()
    if token_type == 'access':
        expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    else:
        expire_minutes = settings.REFRESH_TOKEN_EXPIRE_MINUTES

    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=expire_minutes))
    to_encode.update({"exp": expire, "token_type": token_type})
    return await asyncio.to_thread(
        jwt.encode, to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    