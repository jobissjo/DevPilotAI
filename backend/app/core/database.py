from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.config import settings


# Create the async engine
engine = create_async_engine(settings.DATABASE_URL, echo=True)

# Async dependency for FastAPI routes
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session