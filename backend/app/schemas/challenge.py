from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChallengeCreate(BaseModel):
    title: str
    category: str
    type: str
    difficulty: str | None = None
    points: int = 100
    content: dict


class ChallengeOut(ChallengeCreate):
    id: UUID
    is_active: bool = True
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class HintUnlockRequest(BaseModel):
    hint_id: int
    session_id: UUID
