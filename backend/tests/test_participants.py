import pytest
import uuid
from app.models.session import Session
from app.models.participant import Participant

@pytest.mark.asyncio
async def test_participant_join_idempotency(client, db_session):
    """Same email/session twice -> same UUID."""
    # 1. Create a ready session
    session = Session(join_code="IDEM-123", name="Idempotency Session", status="ready")
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    
    payload = {
        "session_code": "IDEM-123",
        "name": "Test User",
        "email": "test@example.com"
    }
    
    # First join
    response1 = await client.post("/api/v1/participants/join", json=payload)
    assert response1.status_code == 200
    id1 = response1.json()["participant_uuid"]
    
    # Second join
    response2 = await client.post("/api/v1/participants/join", json=payload)
    assert response2.status_code == 200
    id2 = response2.json()["participant_uuid"]
    
    assert id1 == id2

@pytest.mark.asyncio
async def test_join_ended_session_403(client, db_session):
    """Join ended session -> 403."""
    session = Session(join_code="END-123", name="Ended Session", status="ended")
    db_session.add(session)
    await db_session.commit()
    
    payload = {
        "session_code": "END-123",
        "name": "Late User",
        "email": "late@example.com"
    }
    
    response = await client.post("/api/v1/participants/join", json=payload)
    assert response.status_code == 403
    assert "available" in response.json()["detail"].lower()
