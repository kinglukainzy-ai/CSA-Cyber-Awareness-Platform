import pytest
import uuid
from app.models.session import Session
from app.models.participant import Participant
from app.models.hints import ChallengeHint, ParticipantHint
from app.models.challenge import Challenge

@pytest.mark.asyncio
async def test_hint_sequential_unlock(client, db_session):
    # 1. Setup: Session, Challenge, 2 Hints
    session = Session(join_code="HINT-123", name="Hint Session", status="live")
    db_session.add(session)
    await db_session.commit()
    
    challenge = Challenge(
        title="Hint Challenge", category="crypto", type="manual",
        points=100, content={"flag": "test"}, is_active=True
    )
    db_session.add(challenge)
    await db_session.commit()
    await db_session.refresh(challenge)
    
    h1 = ChallengeHint(challenge_id=challenge.id, order_num=1, point_cost=10, riddle_text="Riddle 1")
    h2 = ChallengeHint(challenge_id=challenge.id, order_num=2, point_cost=20, riddle_text="Riddle 2")
    db_session.add_all([h1, h2])
    await db_session.commit()
    await db_session.refresh(h1)
    await db_session.refresh(h2)

    # 2. Setup: Participant
    participant = Participant(name="Hinter", email="hint@ex.com", session_id=session.id)
    db_session.add(participant)
    await db_session.commit()
    await db_session.refresh(participant)
    
    headers = {
        "X-Participant-UUID": str(participant.id),
        "X-Session-Code": "HINT-123"
    }

    # 3. INVALID: Unlock Hint 2 before Hint 1 (400)
    response = await client.post("/api/v1/hints/unlock", headers=headers, json={
        "hint_id": h2.id,
        "session_id": str(session.id)
    })
    assert response.status_code == 400
    assert "previous hint" in response.json()["detail"].lower()

    # 4. VALID: Unlock Hint 1 (200)
    response = await client.post("/api/v1/hints/unlock", headers=headers, json={
        "hint_id": h1.id,
        "session_id": str(session.id)
    })
    assert response.status_code == 200
    assert response.json()["riddle_text"] == "Riddle 1"
    assert response.json().get("cached") is not True

    # 5. VALID: Unlock Hint 1 again (200 + cached: True)
    response = await client.post("/api/v1/hints/unlock", headers=headers, json={
        "hint_id": h1.id,
        "session_id": str(session.id)
    })
    assert response.status_code == 200
    assert response.json()["cached"] is True
