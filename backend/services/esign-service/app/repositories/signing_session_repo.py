from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import SigningSession


class SigningSessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, session_id: UUID) -> SigningSession | None:
        return await self.session.get(SigningSession, session_id)

    async def add(self, signing_session: SigningSession) -> SigningSession:
        self.session.add(signing_session)
        await self.session.flush()
        return signing_session
