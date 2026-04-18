import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin, JSON_COMPAT

class SessionReport(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "session_reports"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    generated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("admins.id"))
    status: Mapped[str] = mapped_column(Text, nullable=False) # 'generating', 'ready', 'failed'
    storage_path: Mapped[Optional[str]] = mapped_column(Text)
    summary_snapshot: Mapped[Optional[dict]] = mapped_column(JSON_COMPAT)
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
