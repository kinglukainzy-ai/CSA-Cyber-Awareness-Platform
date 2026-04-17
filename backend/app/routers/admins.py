from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.admin import Admin
from app.routers.deps import get_current_admin, get_superadmin, hash_password, sanitize_text
from app.schemas.admin import AdminCreate, AdminOut

router = APIRouter(prefix="/admins", tags=["admins"])


@router.get("", response_model=list[AdminOut], dependencies=[Depends(get_superadmin)])
async def list_admins(db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(Admin).order_by(Admin.created_at.desc()))
    return list(result)


@router.post("", response_model=AdminOut, dependencies=[Depends(get_superadmin)])
async def create_admin(payload: AdminCreate, db: AsyncSession = Depends(get_db)):
    admin = Admin(
        full_name=sanitize_text(payload.full_name),
        email=payload.email,
        password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin


@router.delete("/{admin_id}", dependencies=[Depends(get_superadmin)])
async def delete_admin(
    admin_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_admin: Admin = Depends(get_current_admin)
):
    if str(current_admin.id) == admin_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    await db.execute(delete(Admin).where(Admin.id == admin_id))
    await db.commit()
    return {"status": "deleted"}
