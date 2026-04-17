import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class PhishTemplate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "phish_templates"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(Text)
    target_url: Mapped[Optional[str]] = mapped_column(Text)
    difficulty: Mapped[int] = mapped_column(default=1)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("admins.id"))


class PhishCampaign(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "phish_campaigns"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("phish_templates.id"))
    launched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    type: Mapped[Optional[str]] = mapped_column(Text)


class PhishEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "phish_events"

    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("phish_campaigns.id"))
    participant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id"))
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    event_type: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(Text)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    occurred_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
