from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import SessionReport
from app.models.admin import Admin
from app.routers.deps import get_current_admin
from app.workers.tasks import generate_report_task

router = APIRouter(tags=["reports"])


@router.post("/sessions/{session_id}/report/generate", dependencies=[Depends(get_current_admin)])
async def generate_report(session_id: str, db: AsyncSession = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    report = await db.scalar(select(SessionReport).where(SessionReport.session_id == session_id))
    if not report:
        report = SessionReport(session_id=session_id, status="generating", generated_by=admin.id)
        db.add(report)
        await db.commit()
    
    generate_report_task.delay(str(session_id), str(admin.id))
    return {"status": "queued"}


@router.get("/sessions/{session_id}/report", dependencies=[Depends(get_current_admin)])
async def report_status(session_id: str, db: AsyncSession = Depends(get_db)):
    report = await db.scalar(select(SessionReport).where(SessionReport.session_id == session_id))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"status": report.status, "download_url": report.storage_path, "storage_path": report.storage_path}
