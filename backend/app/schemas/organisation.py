from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class OrganisationCreate(BaseModel):
    name: str
    sector: str | None = None
    contact: str | None = None
    email: EmailStr | None = None


class OrganisationOut(OrganisationCreate):
    id: UUID
    created_at: datetime | None = None
    session_count: int = 0

    class Config:
        from_attributes = True
