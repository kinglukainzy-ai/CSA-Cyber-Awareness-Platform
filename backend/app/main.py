from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from socketio import ASGIApp

from app.config import settings
from app.limiter import limiter
from app.routers import admins, auth, breach, challenges, hints, organisations, participants, phishing, polls, scores, serials, sessions
from app.sockets.events import sio

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="CSA Cyber Awareness Platform", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api/v1"

for router in [
    auth.router,
    admins.router,
    organisations.router,
    sessions.router,
    participants.router,
    challenges.router,
    serials.router,
    hints.router,
    scores.router,
    phishing.router,
    polls.router,
    breach.router,
]:
    app.include_router(router, prefix=api_prefix)

@app.get("/health")
async def health():
    return {"status": "ok"}

socket_app = ASGIApp(sio, other_asgi_app=app)
