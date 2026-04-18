import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin

class BreachCheckEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "breach_check_events"

    participant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id"))
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    email_checked: Mapped[str] = mapped_column(Text, nullable=False)
    breach_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_breached: Mapped[bool] = mapped_column(Boolean, nullable=False)
    checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
