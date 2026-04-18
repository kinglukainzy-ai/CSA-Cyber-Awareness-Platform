from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.config import settings
from app.database import get_db
from app.models.admin import Admin
from app.routers.deps import create_token, get_current_admin, verify_password
from app.schemas.auth import LoginRequest, TokenPair
from app.schemas.admin import AdminOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AdminOut)
async def get_me(admin: Admin = Depends(get_current_admin)):
    return admin


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    admin = await db.scalar(select(Admin).where(Admin.email == payload.email))
    if not admin or not verify_password(payload.password, admin.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access = create_token(str(admin.id), timedelta(minutes=settings.jwt_expire_minutes))
    refresh = create_token(str(admin.id), timedelta(days=7))
    
    response.set_cookie("access_token", access, httponly=False, samesite="lax")
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax")
    
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
async def refresh(response: Response, refresh_token: str | None = Cookie(default=None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        admin_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    access = create_token(admin_id, timedelta(minutes=settings.jwt_expire_minutes))
    refresh = create_token(admin_id, timedelta(days=7))
    
    response.set_cookie("access_token", access, httponly=True, samesite="lax")
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax")
    
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/logout")
async def logout(
    response: Response, 
    access_token: str | None = Cookie(default=None),
    refresh_token: str | None = Cookie(default=None)
):
    from app.services.redis_service import blacklist_token
    
    for token in [access_token, refresh_token]:
        if token:
            try:
                payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
                jti = payload.get("jti")
                exp = payload.get("exp")
                if jti and exp:
                    blacklist_token(jti, exp)
            except Exception:
                pass

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"status": "ok"}
