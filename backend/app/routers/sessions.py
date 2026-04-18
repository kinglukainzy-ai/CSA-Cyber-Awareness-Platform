import random
import string
import uuid
from datetime import datetime, timezone

from typing import List, Dict
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.admin import Admin
from app.models.challenge import Challenge
from app.models.participant import Participant
from app.models.session import Session, SessionChallenge
from app.models.report import SessionReport
from app.routers.deps import get_current_admin
from app.schemas.session import SessionAssignChallenges, SessionCreate, SessionOut, SessionStatusUpdate
from app.sockets.events import emit_session_status
from app.workers.tasks import generate_report_task

router = APIRouter(prefix="/sessions", tags=["sessions"])


async def generate_join_code(db: AsyncSession) -> str:
    while True:
        code = "CSA-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        existing = await db.scalar(select(Session).where(Session.join_code == code))
        if not existing:
            return code


@router.get("", response_model=list[SessionOut], dependencies=[Depends(get_current_admin)])
async def list_sessions(status: str | None = None, org: str | None = None, db: AsyncSession = Depends(get_db)):
    query = (
        select(Session, func.count(Participant.id).label("participants_count"))
        .outerjoin(Participant, Participant.session_id == Session.id)
        .group_by(Session.id)
    )
    if status and status != "all":
        query = query.where(Session.status == status)
    if org:
        query = query.where(Session.org_id == org)
    
    result = await db.execute(query.order_by(Session.created_at.desc()))
    sessions = []
    for sess, count in result.all():
        s_data = SessionOut.model_validate(sess)
        s_data.participants_count = count
        sessions.append(s_data)
    return sessions


@router.post("", response_model=SessionOut, dependencies=[Depends(get_current_admin)])
async def create_session(
    payload: SessionCreate,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    session = Session(
        org_id=payload.org_id,
        created_by=admin.id,
        name=payload.name,
        scheduled_at=payload.scheduled_at,
        join_code=await generate_join_code(db),
        status="draft",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    access_token: str | None = Cookie(default=None),
    x_participant_uuid: str | None = Header(default=None, alias="X-Participant-UUID"),
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Auth: allow either a valid admin token OR a participant who belongs to this session
    if access_token:
        try:
            from jose import jwt
            from app.config import settings
            payload = jwt.decode(access_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            admin = await db.scalar(select(Admin).where(Admin.id == uuid.UUID(payload["sub"])))
            if not admin:
                raise HTTPException(status_code=401, detail="Invalid admin")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
    elif x_participant_uuid:
        participant = await db.scalar(
            select(Participant).where(
                Participant.id == uuid.UUID(x_participant_uuid),
                Participant.session_id == session.id,
            )
        )
        if not participant:
            raise HTTPException(status_code=403, detail="Participant does not belong to this session")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    participants_count = await db.scalar(select(func.count(Participant.id)).where(Participant.session_id == session.id))
    challenge_rows = await db.execute(
        select(
            SessionChallenge.challenge_id,
            SessionChallenge.order_num,
            SessionChallenge.unlocked_at,
            Challenge.title,
            Challenge.category,
            Challenge.points,
        )
        .join(Challenge, Challenge.id == SessionChallenge.challenge_id)
        .where(SessionChallenge.session_id == session.id)
        .order_by(SessionChallenge.order_num)
    )
    return {
        "session": SessionOut.model_validate(session),
        "participants_count": participants_count or 0,
        "challenges": [
            {
                "id": str(challenge_id),
                "title": title,
                "category": category,
                "points": points,
                "order_num": order_num,
                "unlocked_at": unlocked_at,
                "is_locked": unlocked_at is None,
            }
            for challenge_id, order_num, unlocked_at, title, category, points in challenge_rows.all()
        ],
    }


@router.put("/{session_id}/status", dependencies=[Depends(get_current_admin)])
async def update_session_status(
    session_id: uuid.UUID, 
    payload: SessionStatusUpdate, 
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    allowed_transitions = {
        "draft": {"ready"},
        "ready": {"live"},
        "live": {"ended"},
        "ended": set(),
    }
    if payload.status not in allowed_transitions.get(session.status, set()):
        raise HTTPException(status_code=400, detail=f"Invalid transition from {session.status} to {payload.status}")
    session.status = payload.status
    if payload.status == "live":
        session.started_at = datetime.now(timezone.utc)
    if payload.status == "ended":
        session.ended_at = datetime.now(timezone.utc)
        # Trigger async report generation
        generate_report_task.delay(str(session.id), str(admin.id))
    await db.commit()
    await emit_session_status(session_id, payload.status)
    return {"status": session.status}


@router.post("/{session_id}/challenges", dependencies=[Depends(get_current_admin)])
async def assign_challenges(session_id: str, payload: SessionAssignChallenges, db: AsyncSession = Depends(get_db)):
    # Check existing to avoid duplicates
    s_uuid = uuid.UUID(session_id)
    existing = await db.scalars(select(SessionChallenge.challenge_id).where(SessionChallenge.session_id == s_uuid))
    existing_ids = set(existing.all())
    
    for index, challenge_id in enumerate(payload.challenge_ids, start=1):
        if challenge_id not in existing_ids:
            db.add(SessionChallenge(session_id=s_uuid, challenge_id=challenge_id, order_num=index))
    
    await db.commit()
    return {"status": "assigned"}


@router.delete("/{session_id}/challenges/{challenge_id}", dependencies=[Depends(get_current_admin)])
async def remove_challenge(session_id: str, challenge_id: str, db: AsyncSession = Depends(get_db)):
    challenge = await db.scalar(select(SessionChallenge).where(SessionChallenge.session_id == session_id, SessionChallenge.challenge_id == challenge_id))
    if challenge:
        await db.delete(challenge)
        await db.commit()
    return {"status": "deleted"}


@router.post("/{session_id}/challenges/{challenge_id}/unlock", dependencies=[Depends(get_current_admin)])
async def unlock_challenge(session_id: str, challenge_id: str, db: AsyncSession = Depends(get_db)):
    """Unlock challenge and notify participants."""
    sc = await db.scalar(
        select(SessionChallenge).where(
            SessionChallenge.session_id == uuid.UUID(session_id),
            SessionChallenge.challenge_id == uuid.UUID(challenge_id),
        )
    )
    if not sc:
        raise HTTPException(status_code=404, detail="Challenge not found in session")
    if sc.unlocked_at is None:
        sc.unlocked_at = datetime.now(timezone.utc)
        await db.commit()
    from app.sockets.events import emit_challenge_unlocked
    await emit_challenge_unlocked(session_id, challenge_id, sc.order_num)
    return {"status": "unlocked", "order_num": sc.order_num}


@router.put("/{session_id}/challenges/reorder", dependencies=[Depends(get_current_admin)])
async def reorder_challenges(session_id: str, payload: List[Dict], db: AsyncSession = Depends(get_db)):
    """
    Body: [{"challenge_id": "uuid", "order_num": 1}, ...]
    """
    for item in payload:
        sc = await db.scalar(
            select(SessionChallenge).where(
                SessionChallenge.session_id == uuid.UUID(session_id),
                SessionChallenge.challenge_id == uuid.UUID(item["challenge_id"])
            )
        )
        if sc:
            sc.order_num = item["order_num"]
    await db.commit()
    return {"status": "reordered"}


@router.get("/{session_id}/report", dependencies=[Depends(get_current_admin)])
async def get_session_report(session_id: str, db: AsyncSession = Depends(get_db)):
    report = await db.scalar(
        select(SessionReport).where(SessionReport.session_id == uuid.UUID(session_id))
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not generated yet")
    
    # Generate a fresh, short-lived presigned URL on demand (1 hour TTL)
    if report.status == "ready" and report.storage_path:
        from app.services.storage_service import get_download_url
        report.storage_path = get_download_url(report.storage_path, expires_in=3600)
        
    return report


@router.post("/{session_id}/report/generate", dependencies=[Depends(get_current_admin)])
async def trigger_report_generation(
    session_id: str, 
    db: AsyncSession = Depends(get_db), 
    admin: Admin = Depends(get_current_admin)
):
    # Upsert/Guard: If already 'generating', don't trigger again.
    report = await db.scalar(
        select(SessionReport).where(SessionReport.session_id == uuid.UUID(session_id))
    )
    if report and report.status == "generating":
        return {"status": "generating", "message": "Report generation already in progress"}
    
    if not report:
        report = SessionReport(session_id=uuid.UUID(session_id), generated_by=admin.id, status="generating")
        db.add(report)
    else:
        report.status = "generating"
        report.generated_by = admin.id
        report.generated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    generate_report_task.delay(session_id, str(admin.id))
    return {"status": "generating"}


@router.get("/{session_id}/participants/{participant_uuid}/score")
async def get_participant_score(session_id: str, participant_uuid: str, db: AsyncSession = Depends(get_db)):
    from app.models.scoring import ParticipantScore
    from sqlalchemy import func

    session_uuid = uuid.UUID(session_id)
    part_uuid = uuid.UUID(participant_uuid)

    # Participant total score and solved count
    stats = await db.execute(
        select(
            func.count(ParticipantScore.id),
            func.sum(func.coalesce(ParticipantScore.final_points, ParticipantScore.base_points - ParticipantScore.hint_deductions))
        ).where(
            ParticipantScore.participant_id == part_uuid,
            ParticipantScore.session_id == session_uuid
        )
    )
    result = stats.one()
    solved_count = result[0]
    total_score = result[1] or 0

    # Rank calculation
    all_scores_query = await db.execute(
        select(
            ParticipantScore.participant_id,
            func.sum(func.coalesce(ParticipantScore.final_points, ParticipantScore.base_points - ParticipantScore.hint_deductions)).label("total")
        ).where(ParticipantScore.session_id == session_uuid)
        .group_by(ParticipantScore.participant_id)
        .order_by(func.sum(func.coalesce(ParticipantScore.final_points, ParticipantScore.base_points - ParticipantScore.hint_deductions)).desc())
    )
    ranked_participants = all_scores_query.all()
    
    total_participants = await db.scalar(
        select(func.count(Participant.id)).where(Participant.session_id == session_uuid)
    ) or 0
    
    rank = 1
    found_in_scores = False
    for pid, score in ranked_participants:
        if pid == part_uuid:
            found_in_scores = True
            break
        rank += 1
    
    # If participant has 0 score and not in ParticipantScore table, they are last
    if not found_in_scores:
        rank = total_participants

    # Total challenges in session
    total_challenges = await db.scalar(
        select(func.count(SessionChallenge.id)).where(SessionChallenge.session_id == session_uuid)
    ) or 0

    return {
        "score": int(total_score),
        "rank": rank,
        "total_participants": total_participants,
        "solved_count": solved_count,
        "total_challenges": total_challenges
    }
