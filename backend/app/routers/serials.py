import uuid
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.models.challenge import Challenge
from app.models.scoring import ChallengeSerial, FlagSubmission, ParticipantScore
from app.models.hints import ParticipantHint
from app.models.participant import Participant
from app.routers.deps import get_participant_uuid
from app.schemas.scoring import FlagSubmissionCreate, FlagSubmissionResponse, SerialResponse
from app.services.serial_service import generate_serial, validate_flag, decode_serial_to_flag
from app.sockets.events import emit_leaderboard_update

router = APIRouter(prefix="/serials", tags=["serials"])

async def build_leaderboard(db: AsyncSession, session_id: str) -> list[dict]:
    # Query matching the requested logic in Section 5
    # SELECT p.name, COALESCE(SUM(ps.final_points), 0) as total,
    #        RANK() OVER (ORDER BY COALESCE(SUM(ps.final_points), 0) DESC) as rank
    # FROM participants p
    # LEFT JOIN participant_scores ps ON ps.participant_id = p.id AND ps.session_id = ?
    # WHERE p.session_id = ?
    # GROUP BY p.id, p.name
    # ORDER BY total DESC
    
    # Using raw SQL for the RANK() window function as it is cleaner than SQLAlchemy ORM for this specific query
    from sqlalchemy import text
    query = text("""
        SELECT p.name, COALESCE(SUM(ps.final_points), 0) as total,
               RANK() OVER (ORDER BY COALESCE(SUM(ps.final_points), 0) DESC) as rank,
               COUNT(ps.id) FILTER (WHERE ps.id IS NOT NULL) as challenges_solved
        FROM participants p
        LEFT JOIN participant_scores ps ON ps.participant_id = p.id AND ps.session_id = :session_id
        WHERE p.session_id = :session_id
        GROUP BY p.id, p.name
        ORDER BY total DESC
    """)
    result = await db.execute(query, {"session_id": uuid.UUID(session_id)})
    return [
        {"name": row[0], "total": int(row[1]), "rank": int(row[2]), "challenges_solved": int(row[3])}
        for row in result.all()
    ]

@router.get("/{challenge_id}", response_model=SerialResponse)
async def get_serial(
    challenge_id: str, 
    participant=Depends(get_participant_uuid), 
    db: AsyncSession = Depends(get_db)
):
    c_id = uuid.UUID(challenge_id)
    
    # Check challenge_serials table — if row exists return cached serial
    serials = await db.scalars(
        select(ChallengeSerial).where(
            ChallengeSerial.challenge_id == c_id, 
            ChallengeSerial.participant_id == participant.id
        )
    )
    serials_list = list(serials)
    
    real_serial = next((s for s in serials_list if not s.is_decoy), None)
    decoy_serials = [s.serial for s in serials_list if s.is_decoy]

    if not real_serial:
        # If not, generate with generate_serial(), INSERT into challenge_serials, return serial
        value = generate_serial(challenge_id, str(participant.id))
        real_serial = ChallengeSerial(
            challenge_id=c_id, 
            participant_id=participant.id, 
            serial=value,
            is_decoy=False
        )
        db.add(real_serial)
        
        # Also generate and store 2 decoy serials (set is_decoy=True)
        # Decoys are red herrings - we'll just derive them slightly differently
        for i in range(2):
            decoy_val = hashlib.sha256(f"{value}:decoy:{i}".encode()).hexdigest()[:12].upper()
            decoy = ChallengeSerial(
                challenge_id=c_id,
                participant_id=participant.id,
                serial=decoy_val,
                is_decoy=True
            )
            db.add(decoy)
            decoy_serials.append(decoy_val)
            
        await db.commit()
    
    return SerialResponse(serial=real_serial.serial, decoys=decoy_serials)

@router.post("/submit", response_model=FlagSubmissionResponse)
@limiter.limit("10/minute")
async def submit_flag(
    payload: FlagSubmissionCreate, 
    request: Request,
    participant=Depends(get_participant_uuid), 
    db: AsyncSession = Depends(get_db)
):
    # Rate limit: max 10 submissions per participant per challenge
    count = await db.scalar(
        select(func.count(FlagSubmission.id)).where(
            FlagSubmission.participant_id == participant.id,
            FlagSubmission.challenge_id == payload.challenge_id
        )
    )
    if count >= 10:
        raise HTTPException(status_code=429, detail="Maximum submission attempts reached for this challenge")

    challenge = await db.get(Challenge, payload.challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # 1. Validate flag via validate_flag()
    is_correct = validate_flag(payload.flag, str(payload.challenge_id), str(participant.id))
    
    # 2. INSERT into flag_submissions (is_correct, points_awarded)
    points_to_award = challenge.points if is_correct else 0
    
    submission = FlagSubmission(
        participant_id=participant.id,
        challenge_id=payload.challenge_id,
        session_id=payload.session_id,
        flag_submitted=payload.flag,
        is_correct=is_correct,
        points_awarded=points_to_award,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(submission)

    # 3. If correct AND no existing participant_scores row for this participant+challenge+session:
    if is_correct:
        existing_score = await db.scalar(
            select(ParticipantScore).where(
                ParticipantScore.participant_id == participant.id,
                ParticipantScore.challenge_id == payload.challenge_id,
                ParticipantScore.session_id == payload.session_id,
            )
        )
        if not existing_score:
            # Calculate hint_deductions from participant_hints table
            deductions = await db.scalar(
                select(func.sum(ParticipantHint.points_deducted)).where(
                    ParticipantHint.participant_id == participant.id,
                    ParticipantHint.session_id == payload.session_id,
                    # We need a way to link hint to challenge. 
                    # ParticipantHint has hint_id, which links to ChallengeHint, which has challenge_id.
                ).join(ParticipantHint.hint_id == ...) # Wait, I need a better query
            )
            # Corrected query for hints related to THIS challenge
            from app.models.hints import ChallengeHint
            deductions = await db.scalar(
                select(func.sum(ParticipantHint.points_deducted))
                .select_from(ParticipantHint)
                .join(ChallengeHint, ParticipantHint.hint_id == ChallengeHint.id)
                .where(
                    ParticipantHint.participant_id == participant.id,
                    ParticipantHint.session_id == payload.session_id,
                    ChallengeHint.challenge_id == payload.challenge_id
                )
            ) or 0
            
            score = ParticipantScore(
                participant_id=participant.id,
                challenge_id=payload.challenge_id,
                session_id=payload.session_id,
                base_points=challenge.points,
                hint_deductions=deductions,
                final_points=challenge.points - deductions,
                solved_at=datetime.now(timezone.utc),
            )
            db.add(score)
            
            # Commit before building leaderboard to include new score
            await db.commit()
            
            # Emit 'leaderboard_update' Socket.io event
            leaderboard = await build_leaderboard(db, str(payload.session_id))
            await emit_leaderboard_update(str(payload.session_id), leaderboard)
        else:
            await db.commit()
    else:
        await db.commit()

    return FlagSubmissionResponse(
        is_correct=is_correct, 
        points_awarded=points_to_award, 
        message="Flag accepted!" if is_correct else "Incorrect flag. Try again."
    )
