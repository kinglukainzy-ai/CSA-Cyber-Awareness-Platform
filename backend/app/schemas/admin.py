from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str


class AdminOut(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime | None = None
    last_login: datetime | None = None

    class Config:
        from_attributes = True
