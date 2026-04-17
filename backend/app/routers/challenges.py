from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.challenge import Challenge
from app.routers.deps import get_current_admin
from app.schemas.challenge import ChallengeCreate, ChallengeOut

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.get("", response_model=list[ChallengeOut], dependencies=[Depends(get_current_admin)])
async def list_challenges(category: str | None = None, type: str | None = None, difficulty: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Challenge).where(Challenge.is_active.is_(True))
    if category:
        query = query.where(Challenge.category == category)
    if type:
        query = query.where(Challenge.type == type)
    if difficulty:
        query = query.where(Challenge.difficulty == difficulty)
    result = await db.scalars(query.order_by(Challenge.created_at.desc()))
    return list(result)


@router.post("", response_model=ChallengeOut, dependencies=[Depends(get_current_admin)])
async def create_challenge(payload: ChallengeCreate, db: AsyncSession = Depends(get_db)):
    challenge = Challenge(**payload.model_dump())
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    return challenge


@router.get("/{challenge_id}", response_model=ChallengeOut, dependencies=[Depends(get_current_admin)])
async def get_challenge(challenge_id: str, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


@router.put("/{challenge_id}", response_model=ChallengeOut, dependencies=[Depends(get_current_admin)])
async def update_challenge(challenge_id: str, payload: ChallengeCreate, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    for key, value in payload.model_dump().items():
        setattr(challenge, key, value)
    await db.refresh(challenge)
    return challenge


@router.patch("/{challenge_id}", response_model=ChallengeOut, dependencies=[Depends(get_current_admin)])
async def patch_challenge(challenge_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    for key, value in payload.items():
        if hasattr(challenge, key):
            setattr(challenge, key, value)
    await db.commit()
    await db.refresh(challenge)
    return challenge


@router.delete("/{challenge_id}", dependencies=[Depends(get_current_admin)])
async def delete_challenge(challenge_id: str, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if challenge:
        challenge.is_active = False
        await db.commit()
    return {"status": "deactivated"}
