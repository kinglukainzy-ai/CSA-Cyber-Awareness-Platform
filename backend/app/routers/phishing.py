from datetime import datetime, timezone
import uuid
from typing import List, Dict, Optional

from fastapi import APIRouter, Depends, Request, Response, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.models.participant import Participant
from app.models.phishing import PhishCampaign, PhishEvent, PhishTemplate
from app.routers.deps import get_current_admin
from app.schemas.phishing import (
    PhishLaunchRequest, 
    PhishTemplateCreate,
    TrackingSubmit,
    TrackingReport
)
from app.sockets.events import emit_phish_event
from app.workers.tasks import send_phish_email

router = APIRouter(tags=["phishing"])

PIXEL = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x00\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'

async def log_event(db: AsyncSession, campaign_id: str, participant_id: str, event_type: str, request: Request | None = None):
    # This helper is used by tracking endpoints
    participant = await db.get(Participant, uuid.UUID(participant_id))
    if not participant:
        return
    
    event = PhishEvent(
        campaign_id=uuid.UUID(campaign_id),
        participant_id=participant.id,
        session_id=participant.session_id,
        event_type=event_type,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.commit()
    
    # Emit Socket.io event to session room
    await emit_phish_event(str(participant.session_id), {
        "event_type": event_type,
        "participant_name": participant.name or "Anonymous",
        "occurred_at": event.occurred_at.isoformat()
    })

@router.get("/phishing/templates", dependencies=[Depends(get_current_admin)])
async def list_templates(db: AsyncSession = Depends(get_db)):
    # Only return active templates if is_active exists, else all
    # For now, we'll implement it with is_active check if we add it soon
    return list(await db.scalars(select(PhishTemplate).order_by(PhishTemplate.created_at.desc())))

@router.post("/sessions/{session_id}/phishing/launch")
async def launch_phishing_campaign(
    session_id: uuid.UUID,
    payload: PhishLaunchRequest,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    1. Fetch all participants for the session
    2. INSERT into phish_campaigns
    3. For each participant: build personalized tracking URLs, replace placeholders, dispatch Celery task
    """
    participants = (await db.execute(
        select(Participant).where(Participant.session_id == session_id)
    )).scalars().all()
    
    template = await db.get(PhishTemplate, payload.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    campaign = PhishCampaign(
        session_id=session_id,
        template_id=payload.template_id,
        type=payload.type,
        launched_at=datetime.now(timezone.utc)
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    
    # TRACKING_BASE_URL should be in settings, e.g., https://track.platform.csa.gov.gh
    tracking_base = getattr(settings, "TRACKING_BASE_URL", settings.api_url)
    
    for participant in participants:
        click_url = f"{tracking_base}/track/click?pid={participant.id}&cid={campaign.id}"
        open_url = f"{tracking_base}/track/open?pid={participant.id}&cid={campaign.id}"
        submit_url = f"{tracking_base}/track/submit" # This one is generic usually or can be custom
        
        # Replace placeholders in body_html
        personalized_html = template.body_html.replace("{{CLICK_URL}}", click_url)\
                                             .replace("{{OPEN_URL}}", open_url)\
                                             .replace("{{PARTICIPANT_NAME}}", participant.name or "Participant")
        
        # Dispatch Celery task
        send_phish_email.delay(participant.email, template.subject, personalized_html)
        
    return { "campaign_id": str(campaign.id), "participants_targeted": len(participants) }

@router.get("/sessions/{session_id}/phishing/stats")
async def get_phishing_stats(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    # Fetch latest campaign for this session
    campaign = (await db.execute(
        select(PhishCampaign).where(PhishCampaign.session_id == session_id).order_by(PhishCampaign.launched_at.desc())
    )).scalar_one_or_none()
    
    if not campaign:
        return {"error": "No campaign launched for this session"}
        
    # Aggregate stats
    # event_types: sent, opened, clicked, submitted, reported
    event_counts = (await db.execute(
        select(PhishEvent.event_type, func.count(PhishEvent.id))
        .where(PhishEvent.session_id == session_id, PhishEvent.campaign_id == campaign.id)
        .group_by(PhishEvent.event_type)
    )).all()
    
    stats_map = {row[0]: row[1] for row in event_counts}
    sent = stats_map.get("sent", 0)
    
    stats = {
        "sent": sent,
        "opened": stats_map.get("opened", 0),
        "opened_rate": round(stats_map.get("opened", 0) / sent, 2) if sent > 0 else 0,
        "clicked": stats_map.get("clicked", 0),
        "clicked_rate": round(stats_map.get("clicked", 0) / sent, 2) if sent > 0 else 0,
        "submitted": stats_map.get("submitted", 0),
        "submitted_rate": round(stats_map.get("submitted", 0) / sent, 2) if sent > 0 else 0,
        "reported": stats_map.get("reported", 0),
        "reported_rate": round(stats_map.get("reported", 0) / sent, 2) if sent > 0 else 0,
    }
    
    # Timeline
    timeline_rows = (await db.execute(
        select(PhishEvent, Participant.name)
        .join(Participant, Participant.id == PhishEvent.participant_id)
        .where(PhishEvent.session_id == session_id, PhishEvent.campaign_id == campaign.id)
        .order_by(PhishEvent.occurred_at.desc())
        .limit(50)
    )).all()
    
    timeline = [
        {
            "event_type": row[0].event_type,
            "occurred_at": row[0].occurred_at.isoformat(),
            "participant_name": row[1] or "Anonymous"
        }
        for row in timeline_rows
    ]
    
    return {
        "campaign_id": str(campaign.id),
        "type": campaign.type,
        "launched_at": campaign.launched_at.isoformat(),
        "stats": stats,
        "timeline": timeline
    }

# Tracking Endpoints - Harden Existing
@router.get("/track/open")
async def track_open(pid: str, cid: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        await log_event(db, cid, pid, "opened", request)
    except Exception:
        pass
    return Response(content=PIXEL, media_type="image/gif")

@router.get("/track/click")
async def track_click(pid: str, cid: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        await log_event(db, cid, pid, "clicked", request)
    except Exception:
        pass
    # Redirect to teachable moment or original target if provided
    return RedirectResponse(f"{settings.FRONTEND_URL}/phishing/catch", status_code=302)

@router.post("/track/submit")
async def track_submit(payload: TrackingSubmit, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        await log_event(db, str(payload.cid), str(payload.pid), "submitted", request)
    except Exception:
        pass
    return RedirectResponse(f"{settings.FRONTEND_URL}/phishing/catch", status_code=303)

@router.post("/track/report")
async def track_report(payload: TrackingReport, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        await log_event(db, str(payload.cid), str(payload.pid), "reported", request)
    except Exception:
        pass
    return {"message": "Report received"}

@router.post("/phishing/templates", dependencies=[Depends(get_current_admin)])
async def create_phish_template(payload: PhishTemplateCreate, db: AsyncSession = Depends(get_db)):
    template = PhishTemplate(**payload.model_dump())
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template

@router.put("/phishing/templates/{template_id}", dependencies=[Depends(get_current_admin)])
async def update_phish_template(template_id: uuid.UUID, payload: PhishTemplateCreate, db: AsyncSession = Depends(get_db)):
    template = await db.get(PhishTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for key, value in payload.model_dump().items():
        setattr(template, key, value)
    await db.commit()
    return template

@router.delete("/phishing/templates/{template_id}", dependencies=[Depends(get_current_admin)])
async def delete_phish_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    template = await db.get(PhishTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    # Check if any campaigns use this template
    campaign_exists = await db.scalar(
        select(func.count(PhishCampaign.id)).where(PhishCampaign.template_id == template_id)
    )
    if campaign_exists > 0:
        raise HTTPException(
            status_code=409, 
            detail="Template is used in one or more campaigns and cannot be deleted."
        )
        
    await db.delete(template)
    await db.commit()
    return {"status": "deleted"}
