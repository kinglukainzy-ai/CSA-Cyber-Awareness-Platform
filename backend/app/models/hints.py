import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.common import UUIDPrimaryKeyMixin

class ChallengeHint(Base):
    __tablename__ = "challenge_hints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    challenge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("challenges.id"))
    order_num: Mapped[int] = mapped_column(Integer, nullable=False)
    riddle_text: Mapped[str] = mapped_column(Text, nullable=False)
    point_cost: Mapped[int] = mapped_column(Integer, nullable=False)


class ParticipantHint(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "participant_hints"

    participant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("participants.id"))
    hint_id: Mapped[int] = mapped_column(Integer, ForeignKey("challenge_hints.id"))
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    points_deducted: Mapped[int] = mapped_column(Integer, nullable=False)
    unlocked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now())
