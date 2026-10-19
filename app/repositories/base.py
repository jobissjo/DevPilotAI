from typing import Any, Generic, TypeVar

from sqlalchemy.exc import IntegrityError
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

Model = TypeVar("Model", bound=SQLModel)


class RepositoryConflict(Exception):
    """A write violated a database integrity constraint."""


class BaseRepository(Generic[Model]):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, record: Model) -> Model:
        self.session.add(record)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise RepositoryConflict from exc
        await self.session.refresh(record)
        return record

    async def update(self, record: Model, values: dict[str, Any]) -> Model:
        record.sqlmodel_update(values)
        return await self.save(record)

    async def delete(self, record: Model) -> None:
        try:
            await self.session.delete(record)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise RepositoryConflict from exc
