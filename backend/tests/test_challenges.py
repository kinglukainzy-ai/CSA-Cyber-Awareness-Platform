import pytest
import uuid
from sqlalchemy import select
from unittest.mock import MagicMock
from app.models.challenge import Challenge
from app.routers.deps import get_current_admin
from app.main import app

@pytest.mark.asyncio
async def test_update_challenge_persistence(client, db_session):
    # 1. Create a Challenge row directly via the ORM model in the test DB
    challenge = Challenge(
        title="Initial Challenge",
        category="crypto",
        type="manual",
        difficulty="easy",
        points=50,
        content={"flag": "initial_flag"},
        is_active=True
    )
    db_session.add(challenge)
    await db_session.commit()
    await db_session.refresh(challenge)
    
    challenge_id = challenge.id

    # Mock authentication - override get_current_admin
    app.dependency_overrides[get_current_admin] = lambda: MagicMock()

    # 1. Update title via PUT
    update_data = {
        "title": "Hardened Challenge",
        "category": "web",
        "type": "manual",
        "points": 100,
        "content": {"flag": "CSA{h4rd3n3d}"}
    }
    response = await client.put(f"/api/v1/challenges/{str(challenge.id)}", json=update_data)
    assert response.status_code == 200

    # 2. Verify in DB
    updated = await db_session.get(Challenge, challenge.id)
    assert updated.title == "Hardened Challenge"
    
    # 3. Open a second independent check (expire current session view to force refetch)
    db_session.expire_all()
    
    # Fetch directly from DB session again
    query = select(Challenge).where(Challenge.id == challenge_id)
    result = await db_session.execute(query)
    updated_challenge = result.scalar_one()
    
    # 4. Assert the title and points values match what was sent in the PUT
    assert updated_challenge.title == "Hardened Challenge"
    assert updated_challenge.points == 100
    
    # Cleanup override
    app.dependency_overrides.pop(get_current_admin, None)
