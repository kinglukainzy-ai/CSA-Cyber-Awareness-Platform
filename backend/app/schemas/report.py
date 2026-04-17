from pydantic import BaseModel


class ReportStatusOut(BaseModel):
    status: str
    download_url: str | None = None
    storage_path: str | None = None
