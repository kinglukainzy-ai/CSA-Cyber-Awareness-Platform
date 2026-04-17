import aiosmtplib
from email.message import EmailMessage

from app.config import settings


async def send_email(to_email: str, subject: str, body_html: str) -> None:
    message = EmailMessage()
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.add_alternative(body_html, subtype="html")
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        start_tls=True,
    )
