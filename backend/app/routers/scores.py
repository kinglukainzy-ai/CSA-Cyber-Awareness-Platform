from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.participant import Participant
from app.models.scoring import ParticipantScore

router = APIRouter(tags=["scores"])


@router.get("/sessions/{session_id}/leaderboard")
async def leaderboard(session_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Participant.name, func.sum(ParticipantScore.final_points).label("total"))
        .join(Participant, Participant.id == ParticipantScore.participant_id)
        .where(ParticipantScore.session_id == session_id)
        .group_by(Participant.id, Participant.name)
        .order_by(func.sum(ParticipantScore.final_points).desc())
    )
    return [{"name": name, "total": total or 0, "rank": rank} for rank, (name, total) in enumerate(rows.all(), start=1)]


@router.get("/sessions/{session_id}/participants/{participant_id}/score")
async def participant_score(session_id: str, participant_id: str, db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(ParticipantScore).where(ParticipantScore.session_id == session_id, ParticipantScore.participant_id == participant_id))
    return list(rows)
