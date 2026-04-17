from uuid import UUID

from pydantic import BaseModel


class PollCreate(BaseModel):
    question: str
    options: list[dict]
    type: str
    order_num: int


class PollResponseCreate(BaseModel):
    answer: dict
    session_id: UUID


class PollResultOut(BaseModel):
    poll_id: UUID
    results: list[dict]
