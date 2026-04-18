import pytest
import uuid
from decimal import Decimal

@pytest.mark.asyncio
async def test_track_open_invalid_uuid(client):
    """GET /track/open with a syntactically invalid UUID for pid returns 200"""
    # pid is expected to be a string in the route, but log_event tries to convert it
    # the route has a bare except that swallows errors.
    response = await client.get("/api/v1/track/open?pid=invalid-uuid&cid=" + str(uuid.uuid4()))
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/gif"

@pytest.mark.asyncio
async def test_track_click_nonexistent_campaign(client):
    """GET /track/click with a valid format but non-existent campaign ID returns 302"""
    # log_event swallows the error if cid doesn't exist or is invalid
    response = await client.get(f"/track/click?pid={uuid.uuid4()}&cid={uuid.uuid4()}")
    assert response.status_code == 302
    assert "/phishing/catch" in response.headers["location"]

@pytest.mark.asyncio
async def test_track_submit_nonexistent_participant(client):
    """POST /track/submit with valid required fields but a non-existent pid returns 303 (Redirect)"""
    # TrackingSubmit Pydantic schema: pid: UUID, cid: UUID
    payload = {
        "pid": str(uuid.uuid4()),
        "cid": str(uuid.uuid4())
    }
    response = await client.post("/api/v1/track/submit", json=payload)
    # RedirectResponse defaults to 307 but the route says 303
    assert response.status_code == 303
    assert "/phishing/catch" in response.headers["location"]
