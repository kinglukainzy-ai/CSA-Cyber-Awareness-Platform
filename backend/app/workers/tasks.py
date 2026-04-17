import asyncio
import uuid
import urllib.parse
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.workers.celery_app import celery
from app.services.pdf_service import build_session_report_pdf
from app.services.email_service import send_email
from app.services.storage_service import upload_file, get_download_url
from app.database import AsyncSessionLocal
from app.models.session import Session, SessionReport
from app.models.organisation import Organisation
from app.models.participant import Participant
from app.models.breach import BreachCheckEvent
from app.models.scoring import ParticipantScore, FlagSubmission
from app.models.hints import ParticipantHint, ChallengeHint
from app.models.challenge import Challenge
from app.models.phishing import PhishCampaign, PhishEvent, PhishTemplate
from app.config import settings

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib


@celery.task
def send_email_task(to_email: str, subject: str, body_html: str) -> dict:
    asyncio.run(_send_email_async(to_email, subject, body_html))
    return {"to_email": to_email, "status": "sent"}


async def _send_email_async(to_email: str, subject: str, body_html: str):
    await send_email(to_email, subject, body_html)


@celery.task
def generate_report_task(session_id: str, admin_id: str) -> dict:
    """Generate PDF report in a fresh event loop."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_generate_report(session_id, admin_id))
    finally:
        loop.close()


async def _generate_report(session_id: str, admin_id: str):
    async with AsyncSessionLocal() as db:
        # ── Fetch core entities ──────────────────────────────────────────────
        session = await db.get(Session, uuid.UUID(session_id))
        if not session:
            return {"error": "session not found"}

        org = await db.get(Organisation, session.org_id) if session.org_id else None

        # ── 1. Session Overview ─────────────────────────────────────────────
        participants = list(
            (await db.execute(select(Participant).where(Participant.session_id == session.id))).scalars()
        )
        total_participants = len(participants)
        
        # ── 2. Phishing Results ─────────────────────────────────────────────
        phish_rows = (await db.execute(
            select(PhishEvent.event_type, func.count(PhishEvent.id))
            .where(PhishEvent.session_id == session.id)
            .group_by(PhishEvent.event_type)
        )).all()
        phish_counts = {et: cnt for et, cnt in phish_rows}
        
        # ── 3. Challenge Performance ────────────────────────────────────────
        # Get category breakdown
        scores_query = (
            select(Challenge.category, func.avg(ParticipantScore.final_points / Challenge.points))
            .join(ParticipantScore, ParticipantScore.challenge_id == Challenge.id)
            .where(ParticipantScore.session_id == session.id)
            .group_by(Challenge.category)
        )
        category_perf = (await db.execute(scores_query)).all()
        challenge_stats = [
            {"category": row[0], "accuracy": round(float(row[1]) * 100, 1)} 
            for row in category_perf
        ]

        # ── 4. Intelligence Consumption ──────────────────────────────────────
        hint_stats = (await db.execute(
            select(func.sum(ParticipantHint.points_deducted), func.count(ParticipantHint.id))
            .where(ParticipantHint.session_id == session.id)
        )).one()
        total_hint_points = int(hint_stats[0] or 0)
        total_hints_unlocked = int(hint_stats[1] or 0)

        # ── 5. Breach Risks ──────────────────────────────────────────────────
        breach_rows = list(
            (await db.execute(
                select(BreachCheckEvent).where(BreachCheckEvent.session_id == session.id)
            )).scalars()
        )
        breached_count = sum(1 for b in breach_rows if b.is_breached)
        breach_exposure_rate = round((breached_count / len(breach_rows) * 100) if breach_rows else 0, 1)

        # ── Awareness Score (Global) ─────────────────────────────────────────
        total_points_earned = await db.scalar(
            select(func.sum(ParticipantScore.final_points))
            .where(ParticipantScore.session_id == session.id)
        ) or 0
        
        # Get max possible points
        from app.models.session import SessionChallenge
        max_possible = await db.scalar(
            select(func.sum(Challenge.points))
            .join(SessionChallenge, SessionChallenge.challenge_id == Challenge.id)
            .where(SessionChallenge.session_id == session.id)
        ) or 0
        max_possible *= total_participants
        
        awareness_score = round((total_points_earned / max_possible * 100) if max_possible else 0, 1)

        # ── Build summary payload ─────────────────────────────────────────────
        summary = {
            "organisation_name": org.name if org else "CSA Engagement",
            "session_name": session.name,
            "instructor_name": "CSA Capacity Building Team",
            "date": session.created_at.strftime("%Y-%m-%d") if session.created_at else "",
            "start_time": session.started_at.strftime("%H:%M") if session.started_at else "--:--",
            "end_time": session.ended_at.strftime("%H:%M") if session.ended_at else "--:--",
            "total_participants": total_participants,
            "awareness_score": awareness_score,
            "phish_stats": {
                "sent": phish_counts.get("sent", total_participants),
                "opened": phish_counts.get("opened", 0),
                "clicked": phish_counts.get("clicked", 0),
                "submitted": phish_counts.get("submitted", 0),
            },
            "challenge_stats": challenge_stats,
            "intel_consumption": {
                "total_points": total_hint_points,
                "hints_unlocked": total_hints_unlocked
            },
            "breach_risks": {
                "checked": len(breach_rows),
                "exposed": breached_count,
                "exposure_rate": breach_exposure_rate
            },
            "benchmarking": {
                "ghana_average": 45.0,
                "status": "Above Average" if awareness_score > 45 else "Below Average"
            }
        }

        # ── Generate PDF ──────────────────────────────────────────────────────
        pdf_bytes = build_session_report_pdf(summary)

        # ── Upload and Save ──────────────────────────────────────────────────
        file_name = f"reports/{session_id}_{uuid.uuid4().hex[:8]}.pdf"
        upload_file(pdf_bytes, file_name)
        download_url = get_download_url(file_name, expires_in=86400)

        report = await db.scalar(select(SessionReport).where(SessionReport.session_id == session.id))
        if not report:
            report = SessionReport(session_id=session.id)
            db.add(report)
        
        report.status = "ready"
        report.storage_path = download_url
        report.summary_snapshot = summary
        report.generated_at = datetime.now(timezone.utc)
        report.generated_by = uuid.UUID(admin_id)

        await db.commit()
        return {"session_id": session_id, "status": "ready", "path": file_name}


@celery.task(bind=True, max_retries=3)
def send_phish_email(self, to_email: str, subject: str, html_body: str):
    """Send a single phishing simulation email via SMTP."""
    try:
        # Use aiosmtplib in a sync context via asyncio.run()
        import asyncio
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))
        
        asyncio.run(aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True
        ))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
