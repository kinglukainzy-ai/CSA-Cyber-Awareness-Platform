import hashlib

import httpx

from app.config import settings


async def check_breach(email: str) -> dict:
    sha1 = hashlib.sha1(email.strip().lower().encode()).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{settings.hibp_api_url}/{prefix}")
        response.raise_for_status()
    breach_count = 0
    for line in response.text.splitlines():
        hash_suffix, count = line.split(":")
        if hash_suffix == suffix:
            breach_count = int(count)
            break
    return {"is_breached": breach_count > 0, "breach_count": breach_count}
