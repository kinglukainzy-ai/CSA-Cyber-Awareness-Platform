from uuid import UUID

from pydantic import BaseModel


class PhishTemplateCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    category: str | None = None
    target_url: str | None = None


class PhishLaunchRequest(BaseModel):
    template_id: UUID
    type: str


class TrackingSubmit(BaseModel):
    pid: UUID
    cid: UUID
    credential_data: dict | None = None


class TrackingReport(BaseModel):
    pid: UUID
    cid: UUID


class TrackingTelemetry(BaseModel):
    pid: UUID
    cid: UUID
    telemetry_type: str
    payload: dict
