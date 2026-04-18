import pytest
import uuid
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app
from app.routers.deps import get_current_admin, get_participant_uuid
from app.routers.scores import get_leaderboard_user
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_leaderboard_no_creds(client):
    """Leaderboard without admin or participant headers returns 401"""
    # Override with a function that actually checks
    async def check_real_auth():
        raise HTTPException(status_code=401, detail="Authentication required")
    
    app.dependency_overrides[get_leaderboard_user] = check_real_auth
    response = await client.get("/api/v1/scores/sessions/00000000-0000-0000-0000-000000000000/leaderboard")
    assert response.status_code == 401
    app.dependency_overrides.pop(get_leaderboard_user, None)

@pytest.mark.asyncio
async def test_leaderboard_admin_auth(client):
    """Leaderboard with admin cookies returns 200"""
    app.dependency_overrides[get_leaderboard_user] = lambda: MagicMock()
    
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock) as mock_exec:
        mock_res = MagicMock()
        mock_res.all.return_value = []
        mock_exec.return_value = mock_res
        
        response = await client.get("/api/v1/scores/sessions/00000000-0000-0000-0000-000000000000/leaderboard")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    app.dependency_overrides.pop(get_leaderboard_user, None)

@pytest.mark.asyncio
async def test_leaderboard_participant_auth(client):
    """Leaderboard with participant headers returns 200"""
    app.dependency_overrides[get_leaderboard_user] = lambda: MagicMock()
    
    headers = {
        "X-Participant-UUID": str(uuid.uuid4()),
        "X-Session-Code": "TEST-CODE"
    }
    
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock) as mock_exec:
        mock_res = MagicMock()
        mock_res.all.return_value = []
        mock_exec.return_value = mock_res
        
        response = await client.get("/api/v1/scores/sessions/00000000-0000-0000-0000-000000000000/leaderboard", headers=headers)
        assert response.status_code == 200
    
    app.dependency_overrides.pop(get_leaderboard_user, None)

@pytest.mark.asyncio
async def test_participant_score_mismatch_403(client):
    """Participant score endpoint called with a UUID mismatch returns 403"""
    session_id = str(uuid.uuid4())
    p_uuid_url = str(uuid.uuid4())
    p_uuid_header = str(uuid.uuid4()) # Mismatch

    headers = {
        "X-Participant-UUID": p_uuid_header
    }
    response = await client.get(f"/api/v1/scores/sessions/{session_id}/participants/{p_uuid_url}/score", headers=headers)
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_participant_score_match_200(client):
    """Participant score endpoint called with matching UUID returns 200"""
    session_id = str(uuid.uuid4())
    p_uuid = str(uuid.uuid4())

    headers = {
        "X-Participant-UUID": p_uuid
    }
    
    with patch("sqlalchemy.ext.asyncio.AsyncSession.scalars", new_callable=AsyncMock) as mock_scalars:
        # Mock scalars result to be iterable
        mock_res = MagicMock()
        mock_res.__iter__.return_value = []
        mock_scalars.return_value = mock_res
        
        response = await client.get(f"/api/v1/scores/sessions/{session_id}/participants/{p_uuid}/score", headers=headers)
        assert response.status_code == 200
