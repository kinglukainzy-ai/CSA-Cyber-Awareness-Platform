from datetime import datetime, timezone
import uuid
from typing import List, Dict

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.poll import Poll, PollResponse
from app.models.participant import Participant
from app.routers.deps import get_current_admin
from app.schemas.poll import PollCreate, PollResponseCreate
from app.sockets.events import emit_poll_launched, emit_poll_results

router = APIRouter(tags=["polls"])

@router.get("/sessions/{session_id}/polls")
async def list_polls(
    session_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Returns all polls for the session.
    Locked polls: metadata only.
    Unlocked polls: include aggregated response counts.
    """
    polls = (await db.execute(
        select(Poll).where(Poll.session_id == session_id).order_by(Poll.order_num)
    )).scalars().all()
    
    results = []
    for poll in polls:
        is_unlocked = poll.unlocked_at is not None
        poll_data = {
            "id": str(poll.id),
            "question": poll.question,
            "options": poll.options,
            "type": poll.type,
            "order_num": poll.order_num,
            "is_unlocked": is_unlocked
        }
        
        if is_unlocked:
            # Aggregate results
            counts = (await db.execute(
                select(PollResponse.answer, func.count(PollResponse.id))
                .where(PollResponse.poll_id == poll.id)
                .group_by(PollResponse.answer)
            )).all()
            # answer is stored as JSONB like {"selected": "a"}
            # We need to extract the 'selected' value for aggregated results
            # The prompt says: "results": {"a": 12, "b": 4, "c": 1}
            agg_results = {}
            for ans, count in counts:
                selected = ans.get("selected")
                if selected:
                    agg_results[selected] = count
            poll_data["results"] = agg_results
            
        results.append(poll_data)
        
    return results

@router.post("/sessions/{session_id}/polls")
async def create_poll(
    session_id: uuid.UUID, 
    payload: PollCreate, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    poll = Poll(
        session_id=session_id,
        question=payload.question,
        options=payload.options,
        type=payload.type,
        order_num=payload.order_num,
        unlocked_at=None,
        created_by=admin.id
    )
    db.add(poll)
    await db.commit()
    await db.refresh(poll)
    return poll

@router.post("/polls/{poll_id}/launch")
async def launch_poll(
    poll_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    poll = await db.get(Poll, poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll.unlocked_at = datetime.now(timezone.utc)
    await db.commit()
    
    await emit_poll_launched(str(poll.session_id), {
        "poll_id": str(poll.id),
        "question": poll.question,
        "options": poll.options,
        "type": poll.type
    })
    
    return {"message": "Poll launched"}

@router.post("/polls/{poll_id}/respond")
async def respond_to_poll(
    poll_id: uuid.UUID,
    payload: PollResponseCreate,
    x_participant_uuid: uuid.UUID = Header(...),
    db: AsyncSession = Depends(get_db)
):
    # Verify participant exists
    participant = await db.get(Participant, x_participant_uuid)
    if not participant:
        raise HTTPException(status_code=403, detail="Invalid participant UUID")

    poll = await db.get(Poll, poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # Upsert logic (check for existing response)
    existing_response = (await db.execute(
        select(PollResponse).where(
            PollResponse.poll_id == poll_id,
            PollResponse.participant_id == x_participant_uuid
        )
    )).scalar_one_or_none()

    if existing_response:
        existing_response.answer = payload.answer
        existing_response.responded_at = datetime.now(timezone.utc)
    else:
        response = PollResponse(
            poll_id=poll_id,
            participant_id=x_participant_uuid,
            session_id=payload.session_id,
            answer=payload.answer,
            responded_at=datetime.now(timezone.utc)
        )
        db.add(response)
    
    await db.commit()

    # Re-aggregate results
    counts = (await db.execute(
        select(PollResponse.answer, func.count(PollResponse.id))
        .where(PollResponse.poll_id == poll_id)
        .group_by(PollResponse.answer)
    )).all()
    
    results = {}
    for ans, count in counts:
        selected = ans.get("selected")
        if selected:
            results[selected] = count
            
    await emit_poll_results(str(poll.session_id), str(poll_id), results)
    
    return {"status": "success"}

@router.get("/polls/{poll_id}/results")
async def get_poll_results(
    poll_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    counts = (await db.execute(
        select(PollResponse.answer, func.count(PollResponse.id))
        .where(PollResponse.poll_id == poll_id)
        .group_by(PollResponse.answer)
    )).all()
    
    results = {}
    for ans, count in counts:
        selected = ans.get("selected")
        if selected:
            results[selected] = count
            
    return results
