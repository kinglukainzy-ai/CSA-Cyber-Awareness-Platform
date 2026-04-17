from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SessionCreate(BaseModel):
    org_id: UUID | None = None
    name: str
    scheduled_at: datetime | None = None


class SessionStatusUpdate(BaseModel):
    status: str


class SessionAssignChallenges(BaseModel):
    challenge_ids: list[UUID]


class SessionOut(BaseModel):
    id: UUID
    name: str
    join_code: str
    status: str
    scheduled_at: datetime | None = None
    participants_count: int = 0
    created_at: datetime | None = None

    class Config:
        from_attributes = True
