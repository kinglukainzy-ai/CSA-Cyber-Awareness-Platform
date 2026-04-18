import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.hints import ChallengeHint, ParticipantHint
from app.routers.deps import get_participant_uuid
from app.schemas.challenge import HintUnlockRequest

router = APIRouter(prefix="/hints", tags=["hints"])


@router.get("/{challenge_id}")
async def list_hints(
    challenge_id: str, 
    participant=Depends(get_participant_uuid), 
    db: AsyncSession = Depends(get_db)
):
    c_id = uuid.UUID(challenge_id)
    
    # Get all hints for the challenge
    hints = list(await db.scalars(
        select(ChallengeHint)
        .where(ChallengeHint.challenge_id == c_id)
        .order_by(ChallengeHint.order_num)
    ))
    
    # Get all hints already unlocked by this participant in this challenge's context
    # Note: ParticipantHint doesn't have challenge_id, but it links to ChallengeHint
    unlocked = list(await db.scalars(
        select(ParticipantHint)
        .join(ChallengeHint, ParticipantHint.hint_id == ChallengeHint.id)
        .where(
            ParticipantHint.participant_id == participant.id,
            ChallengeHint.challenge_id == c_id
        )
    ))
    unlocked_ids = {item.hint_id for item in unlocked}

    return [
        {
            "id": hint.id,
            "order_num": hint.order_num,
            "point_cost": hint.point_cost,
            "riddle_text": hint.riddle_text,
            "is_unlocked": hint.id in unlocked_ids
        }
        for hint in hints
    ]


@router.post("/unlock")
async def unlock_hint(
    payload: HintUnlockRequest, 
    participant=Depends(get_participant_uuid), 
    db: AsyncSession = Depends(get_db)
):
    hint = await db.get(ChallengeHint, payload.hint_id)
    if not hint:
        raise HTTPException(status_code=404, detail="Hint not found")
        
    existing = await db.scalar(
        select(ParticipantHint).where(
            ParticipantHint.participant_id == participant.id, 
            ParticipantHint.hint_id == hint.id
        )
    )
    if existing:
        return {"riddle_text": hint.riddle_text, "cached": True}

    # Optional: Logic to ensure sequential unlock as in original file
    if hint.order_num > 1:
        prev_hint = await db.scalar(
            select(ChallengeHint).where(
                ChallengeHint.challenge_id == hint.challenge_id, 
                ChallengeHint.order_num == hint.order_num - 1
            )
        )
        if prev_hint:
            prev_unlock = await db.scalar(
                select(ParticipantHint).where(
                    ParticipantHint.participant_id == participant.id, 
                    ParticipantHint.hint_id == prev_hint.id
                )
            )
            if not prev_unlock:
                raise HTTPException(status_code=400, detail="Must unlock previous hints first")

    # Insert into participant_hints
    unlocked = ParticipantHint(
        participant_id=participant.id,
        hint_id=hint.id,
        session_id=payload.session_id,
        points_deducted=hint.point_cost,
        unlocked_at=datetime.now(timezone.utc),
    )
    db.add(unlocked)
    await db.commit()
    
    return {"riddle_text": hint.riddle_text}
