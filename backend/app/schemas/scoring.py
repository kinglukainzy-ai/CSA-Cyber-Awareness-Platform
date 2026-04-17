from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class FlagSubmissionCreate(BaseModel):
    challenge_id: UUID
    flag: str
    session_id: UUID

class FlagSubmissionResponse(BaseModel):
    is_correct: bool
    points_awarded: int
    message: str

class SerialResponse(BaseModel):
    serial: str
    decoys: list[str] = []

class LeaderboardEntry(BaseModel):
    name: str
    total: int
    rank: int
    challenges_solved: int

class ScoreBreakdown(BaseModel):
    challenge_title: str
    base_points: int
    hint_deductions: int
    final_points: int
    solved_at: datetime | None
