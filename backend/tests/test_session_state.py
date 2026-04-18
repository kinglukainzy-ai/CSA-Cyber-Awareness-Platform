import pytest
import uuid
from unittest.mock import MagicMock
from app.models.session import Session
from app.routers.deps import get_current_admin
from app.main import app

@pytest.mark.asyncio
async def test_session_state_transitions(client, db_session):
    # Mock admin auth
    app.dependency_overrides[get_current_admin] = lambda: MagicMock()
    
    # 1. Create a draft session
    session = Session(
        join_code="TEST-123",
        name="Test Session",
        status="draft"
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    s_id = str(session.id)

    # 2. VALID: draft -> ready (200)
    response = await client.put(f"/api/v1/sessions/{s_id}/status", json={"status": "ready"})
    assert response.status_code == 200
    assert response.json()["status"] == "ready"

    # 3. VALID: ready -> live (200)
    response = await client.put(f"/api/v1/sessions/{s_id}/status", json={"status": "live"})
    assert response.status_code == 200
    assert response.json()["status"] == "live"

    # 4. VALID: live -> ended (200)
    response = await client.put(f"/api/v1/sessions/{s_id}/status", json={"status": "ended"})
    assert response.status_code == 200
    assert response.json()["status"] == "ended"

    # 5. INVALID: ended -> live (400)
    response = await client.put(f"/api/v1/sessions/{s_id}/status", json={"status": "live"})
    assert response.status_code == 400
    assert "invalid transition" in response.json()["detail"].lower()

    # 6. INVALID: draft -> live (400)
    # Create new draft
    new_session = Session(join_code="TEST-456", name="New Session", status="draft")
    db_session.add(new_session)
    await db_session.commit()
    await db_session.refresh(new_session)
    n_id = str(new_session.id)
    
    response = await client.put(f"/api/v1/sessions/{n_id}/status", json={"status": "live"})
    assert response.status_code == 400
    assert "invalid transition" in response.json()["detail"].lower()
    
    app.dependency_overrides.pop(get_current_admin, None)
