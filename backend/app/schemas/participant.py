from uuid import UUID
from pydantic import BaseModel, EmailStr

class ParticipantJoin(BaseModel):
    session_code: str
    name: str
    email: EmailStr

class ParticipantJoinResponse(BaseModel):
    participant_uuid: UUID
    session_id: UUID
    session_name: str
    org_name: str | None = None

class ParticipantStatus(BaseModel):
    is_valid: bool
    session_status: str
    session_name: str
