import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.models.breach import BreachCheckEvent
from app.models.participant import Participant
from app.services.breach_service import check_breach
from app.routers.deps import get_participant_uuid

router = APIRouter(prefix="/breach", tags=["breach"])


@router.get("/check")
@limiter.limit("5/minute")
async def breach_check(
    email: str, 
    request: Request,
    participant: Participant = Depends(get_participant_uuid),
    db: AsyncSession = Depends(get_db)
):
    # Logic: 1. Check HibP API (done in service)
    result = await check_breach(email)
    
    # Logic: 2. INSERT event into breach_check_events
    event = BreachCheckEvent(
        participant_id=participant.id,
        session_id=participant.session_id,
        email_checked=email, 
        breach_count=result["breach_count"], 
        is_breached=result["is_breached"],
        checked_at=datetime.now(timezone.utc)
    )
    db.add(event)
    await db.commit()
    
    # Logic: 3. Return { is_breached, breach_count }
    return result
