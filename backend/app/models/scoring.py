import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Computed, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin, TimestampMixin

class ChallengeSerial(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "challenge_serials"

    challenge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("challenges.id"))
    participant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id"))
    serial: Mapped[str] = mapped_column(Text, nullable=False)
    is_decoy: Mapped[bool] = mapped_column(Boolean, default=False)


class FlagSubmission(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "flag_submissions"

    participant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id"))
    challenge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("challenges.id"))
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    flag_submitted: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    points_awarded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ParticipantScore(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "participant_scores"

    participant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id"))
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    challenge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("challenges.id"))
    base_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hint_deductions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    final_points: Mapped[int] = mapped_column(
        Integer,
        Computed("base_points - hint_deductions", persisted=True)
    )
    solved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
