from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.organisation import Organisation
from app.routers.deps import get_current_admin, sanitize_text
from app.schemas.organisation import OrganisationCreate, OrganisationOut

from sqlalchemy import func
from app.models.session import Session

router = APIRouter(prefix="/organisations", tags=["organisations"])


@router.get("", response_model=list[OrganisationOut], dependencies=[Depends(get_current_admin)])
async def list_organisations(db: AsyncSession = Depends(get_db)):
    # Query orgs with session count
    query = (
        select(Organisation, func.count(Session.id).label("session_count"))
        .outerjoin(Session, Session.org_id == Organisation.id)
        .group_by(Organisation.id)
        .order_by(Organisation.created_at.desc())
    )
    result = await db.execute(query)
    orgs = []
    for org, count in result.all():
        org_data = OrganisationOut.model_validate(org)
        org_data.session_count = count
        orgs.append(org_data)
    return orgs


@router.post("", response_model=OrganisationOut, dependencies=[Depends(get_current_admin)])
async def create_organisation(payload: OrganisationCreate, db: AsyncSession = Depends(get_db)):
    org = Organisation(
        name=sanitize_text(payload.name),
        sector=sanitize_text(payload.sector) if payload.sector else None,
        contact=sanitize_text(payload.contact) if payload.contact else None,
        email=payload.email,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/{org_id}", response_model=OrganisationOut, dependencies=[Depends(get_current_admin)])
async def get_organisation(org_id: str, db: AsyncSession = Depends(get_db)):
    org = await db.get(Organisation, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return org


@router.put("/{org_id}", response_model=OrganisationOut, dependencies=[Depends(get_current_admin)])
async def update_organisation(org_id: str, payload: OrganisationCreate, db: AsyncSession = Depends(get_db)):
    org = await db.get(Organisation, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    org.name = sanitize_text(payload.name)
    org.sector = sanitize_text(payload.sector) if payload.sector else None
    org.contact = sanitize_text(payload.contact) if payload.contact else None
    org.email = payload.email
    await db.commit()
    await db.refresh(org)
    return org
