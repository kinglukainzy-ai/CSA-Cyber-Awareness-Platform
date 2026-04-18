from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.participant import Participant
from app.models.scoring import ParticipantScore
from app.routers.deps import get_current_admin, get_participant_uuid

router = APIRouter(prefix="/scores", tags=["scores"])


async def get_leaderboard_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Attempts admin auth first, falls back to participant auth.
    """
    try:
        return await get_current_admin(
            access_token=request.cookies.get("access_token"),
            db=db
        )
    except HTTPException as e:
        if e.status_code == status.HTTP_401_UNAUTHORIZED:
            try:
                x_p_uuid = request.headers.get("X-Participant-UUID")
                x_s_code = request.headers.get("X-Session-Code")
                if not x_p_uuid or not x_s_code:
                     raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
                return await get_participant_uuid(
                    x_participant_uuid=x_p_uuid,
                    x_session_code=x_s_code,
                    db=db
                )
            except HTTPException:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        raise e


@router.get("/sessions/{session_id}/leaderboard", dependencies=[Depends(get_leaderboard_user)])
async def leaderboard(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Participant.name, func.sum(ParticipantScore.final_points).label("total"))
        .join(Participant, Participant.id == ParticipantScore.participant_id)
        .where(ParticipantScore.session_id == session_id)
        .group_by(Participant.id, Participant.name)
        .order_by(func.sum(ParticipantScore.final_points).desc())
    )
    return [{"name": name, "total": total or 0, "rank": rank} for rank, (name, total) in enumerate(rows.all(), start=1)]


@router.get("/sessions/{session_id}/participants/{participant_id}/score")
async def participant_score(
    session_id: uuid.UUID, 
    participant_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    x_participant_uuid: uuid.UUID = Header(..., alias="X-Participant-UUID")
):
    if x_participant_uuid != participant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to participant score")
        
    rows = await db.scalars(select(ParticipantScore).where(ParticipantScore.session_id == session_id, ParticipantScore.participant_id == participant_id))
    return list(rows)
