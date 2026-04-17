import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.models.organisation import Organisation
from app.models.participant import Participant
from app.models.session import Session
from app.schemas.participant import ParticipantJoin, ParticipantJoinResponse, ParticipantStatus

router = APIRouter(tags=["participants"])


@router.post("/participants/join", response_model=ParticipantJoinResponse)
@limiter.limit("5/minute")
async def join_session(payload: ParticipantJoin, request: Request, db: AsyncSession = Depends(get_db)):
    # 1. Look up session by join_code — must have status IN ('ready', 'live') else 403
    session = await db.scalar(select(Session).where(Session.join_code == payload.session_code))
    if not session or session.status not in {"ready", "live"}:
        raise HTTPException(status_code=403, detail="Session not available for joining")

    # 2. SELECT * FROM participants WHERE email = ? AND session_id = ?
    participant = await db.scalar(
        select(Participant).where(
            Participant.email == payload.email, 
            Participant.session_id == session.id
        )
    )

    if not participant:
        # No row → INSERT, return new UUID
        participant = Participant(
            session_id=session.id,
            name=payload.name,
            email=payload.email,
            joined_at=datetime.now(timezone.utc),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(participant)
        await db.commit()
        await db.refresh(participant)
    
    # Row exists or just created → return UUID
    org_name = None
    if session.org_id:
        org = await db.get(Organisation, session.org_id)
        org_name = org.name if org else None

    return ParticipantJoinResponse(
        participant_uuid=participant.id, 
        session_id=session.id, 
        session_name=session.name, 
        org_name=org_name
    )


@router.get("/participants/{participant_uuid}/status", response_model=ParticipantStatus)
async def participant_status(
    participant_uuid: str, 
    db: AsyncSession = Depends(get_db),
    x_participant_uuid: str | None = Header(default=None, alias="X-Participant-UUID")
):
    # Validate header matches URL param
    if x_participant_uuid and x_participant_uuid != participant_uuid:
        raise HTTPException(status_code=403, detail="Header/Param UUID mismatch")

    participant = await db.get(Participant, uuid.UUID(participant_uuid))
    if not participant:
        return ParticipantStatus(is_valid=False, session_status="unknown", session_name="unknown")

    session = await db.get(Session, participant.session_id)
    if not session:
        return ParticipantStatus(is_valid=False, session_status="unknown", session_name="unknown")

    return ParticipantStatus(
        is_valid=True,
        session_status=session.status,
        session_name=session.name
    )
