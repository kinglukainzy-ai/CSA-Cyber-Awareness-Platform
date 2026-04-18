from datetime import datetime, timezone
import socketio
from sqlalchemy import select
from app.config import settings
from jose import jwt

# Initialize Socket.io AsyncServer
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.frontend_url)


# Helper to get session room name
def get_session_room(session_id: str) -> str:
    return f"session:{session_id}"


@sio.event
async def connect(sid, environ, auth):
    """
    Authenticate connection using JWT from the 'auth' object.
    Required for admins, optional for participants.
    """
    if auth and "token" in auth:
        try:
            payload = jwt.decode(
                auth["token"], 
                settings.jwt_secret, 
                algorithms=[settings.jwt_algorithm]
            )
            jti = payload.get("jti")
            if jti:
                from app.services.redis_service import is_token_blacklisted
                if is_token_blacklisted(jti):
                    print(f"[socket:connect] Token revoked for {sid}")
                    return False

            # Store identity on session. Participants won't have this, so they connect as guests.
            await sio.save_session(sid, {
                "user_id": payload.get("sub"),
                "role": "admin"
            })
            return True
        except Exception as e:
            print(f"[socket:connect] Auth failed: {e}")
            return False
    
    # Allow participants to connect without JWT (they identify by session room)
    return True


async def is_admin(sid) -> bool:
    """Helper to check if the current SID belongs to an authenticated admin."""
    session = await sio.get_session(sid)
    return session and session.get("role") == "admin"


@sio.event
async def join_session(sid, data):
    """
    Event for participants and instructors to join a session room.
    Hardened: verifies participant belongs to the session.
    """
    session_id = data.get("session_id")
    participant_id = data.get("participant_id")
    session_code = data.get("session_code")

    if not session_id:
        return

    # If admin, they can join any room they are managing
    if await is_admin(sid):
        await sio.enter_room(sid, get_session_room(session_id))
        return

    # If participant, verify binding
    if participant_id and session_code:
        try:
            from app.database import AsyncSessionLocal
            from app.models.participant import Participant
            from app.models.session import Session
            import uuid
            
            async with AsyncSessionLocal() as db:
                participant = await db.scalar(
                    select(Participant)
                    .join(Session, Session.id == Participant.session_id)
                    .where(
                        Participant.id == uuid.UUID(participant_id),
                        Participant.session_id == uuid.UUID(session_id),
                        Session.join_code == session_code
                    )
                )
                if participant:
                    await sio.enter_room(sid, get_session_room(session_id))
                    return
        except Exception as e:
            print(f"[socket:join_session] Validation error: {e}")
    
    print(f"[socket:join_session] Unauthorized join attempt by {sid} for room {session_id}")


@sio.event
async def unlock_challenge(sid, data):
    """
    Instructor unlocks a challenge for all participants in the session.
    Persists unlocked_at to session_challenges via DB, then broadcasts.
    """
    session_id = data.get("session_id")
    challenge_id = data.get("challenge_id")
    order_num = data.get("order_num", 0)

    if not session_id or not challenge_id:
        return

    if not await is_admin(sid):
        print(f"[socket:unlock_challenge] Unauthorized attempt by {sid}")
        return

    # Lazy import to avoid circular deps
    try:
        from app.database import AsyncSessionLocal
        from app.models.session import SessionChallenge
        import uuid

        async with AsyncSessionLocal() as db:
            sc = await db.scalar(
                select(SessionChallenge).where(
                    SessionChallenge.session_id == uuid.UUID(session_id),
                    SessionChallenge.challenge_id == uuid.UUID(challenge_id),
                )
            )
            if sc and sc.unlocked_at is None:
                sc.unlocked_at = datetime.now(timezone.utc)
                await db.commit()
                # Use the actual order_num from DB
                order_num = sc.order_num
    except Exception as e:
        print(f"[socket:unlock_challenge] DB error: {e}")

    await emit_challenge_unlocked(session_id, challenge_id, order_num)


@sio.event
async def launch_poll(sid, data):
    """Instructor launches a poll — broadcasts it to all participants."""
    session_id = data.get("session_id")
    poll_id = data.get("poll_id")

    if not session_id or not poll_id:
        return

    if not await is_admin(sid):
        print(f"[socket:launch_poll] Unauthorized attempt by {sid}")
        return

    try:
        from app.database import AsyncSessionLocal
        from app.models.poll import Poll
        import uuid

        async with AsyncSessionLocal() as db:
            poll = await db.get(Poll, uuid.UUID(poll_id))
            if poll:
                poll.unlocked_at = datetime.now(timezone.utc)
                await db.commit()
                await emit_poll_launched(session_id, {
                    "id": str(poll.id),
                    "question": poll.question,
                    "options": poll.options,
                    "type": poll.type,
                })
    except Exception as e:
        print(f"[socket:launch_poll] DB error: {e}")


@sio.event
async def end_session(sid, data):
    """Instructor ends session — transitions status and triggers report gen."""
    session_id = data.get("session_id")
    admin_id = data.get("admin_id")

    if not session_id:
        return

    if not await is_admin(sid):
        print(f"[socket:end_session] Unauthorized attempt by {sid}")
        return

    try:
        from app.database import AsyncSessionLocal
        from app.models.session import Session
        from app.workers.tasks import generate_report_task
        import uuid

        async with AsyncSessionLocal() as db:
            session = await db.get(Session, uuid.UUID(session_id))
            if session and session.status == "live":
                session.status = "ended"
                session.ended_at = datetime.now(timezone.utc)
                await db.commit()
                if admin_id:
                    generate_report_task.delay(session_id, admin_id)

        await emit_session_status(session_id, "ended")
    except Exception as e:
        print(f"[socket:end_session] DB error: {e}")


# ─── Server-emitted helper functions (used by REST routers) ──────────────────


async def emit_session_status(session_id: str, status: str) -> None:
    await sio.emit("session_status", {"type": "session_status", "status": status}, room=get_session_room(session_id))


async def emit_challenge_unlocked(session_id: str, challenge_id: str, order_num: int) -> None:
    await sio.emit("challenge_unlocked", {
        "challenge_id": challenge_id,
        "order_num": order_num,
        "occurred_at": datetime.now(timezone.utc).isoformat()
    }, room=get_session_room(session_id))


async def emit_poll_launched(session_id: str, poll_data: dict) -> None:
    await sio.emit("poll_launched", poll_data, room=get_session_room(session_id))


async def emit_poll_results(session_id: str, poll_id: str, results: list) -> None:
    await sio.emit("poll_results", {"poll_id": poll_id, "results": results}, room=get_session_room(session_id))


async def emit_phish_event(session_id: str, event_data: dict) -> None:
    await sio.emit("phish_event", event_data, room=get_session_room(session_id))


async def emit_leaderboard_update(session_id: str, leaderboard: list) -> None:
    await sio.emit("leaderboard_update", {"leaderboard": leaderboard}, room=get_session_room(session_id))


async def emit_participant_joined(session_id: str, name: str, total_participants: int) -> None:
    await sio.emit("participant_joined", {
        "name": name,
        "total_participants": total_participants
    }, room=get_session_room(session_id))
