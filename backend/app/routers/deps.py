import uuid
from datetime import datetime, timedelta, timezone

import bleach
from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.admin import Admin
from app.models.participant import Participant

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_token(subject: str, expires_delta: timedelta) -> str:
    jti = str(uuid.uuid4())
    payload = {
        "sub": subject, 
        "exp": datetime.now(timezone.utc) + expires_delta,
        "jti": jti
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def sanitize_text(value: str) -> str:
    return bleach.clean(value, tags=[], strip=True)


async def get_current_admin(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> Admin:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = jwt.decode(access_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        jti = payload.get("jti")
        if jti:
            from app.services.redis_service import is_token_blacklisted
            if is_token_blacklisted(jti):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")
        admin_id = payload["sub"]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    admin = await db.scalar(select(Admin).where(Admin.id == uuid.UUID(admin_id)))
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
    return admin


async def get_superadmin(admin: Admin = Depends(get_current_admin)) -> Admin:
    if admin.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin only")
    return admin


async def get_participant_uuid(
    x_participant_uuid: str = Header(..., alias="X-Participant-UUID"),
    x_session_code: str = Header(..., alias="X-Session-Code"),
    db: AsyncSession = Depends(get_db),
) -> Participant:
    from app.models.session import Session
    participant = await db.scalar(
        select(Participant)
        .join(Session, Session.id == Participant.session_id)
        .where(
            Participant.id == uuid.UUID(x_participant_uuid),
            Session.join_code == x_session_code
        )
    )
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found or session mismatch")
    return participant
