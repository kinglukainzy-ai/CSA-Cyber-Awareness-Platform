import httpx
import hashlib
from app.config import settings

def _hash_email(email: str) -> str:
    """Lowercases, strips, and hashes email with pepers-SHA256."""
    clean_email = email.lower().strip()
    payload = f"{clean_email}{settings.breach_pepper}"
    return hashlib.sha256(payload.encode()).hexdigest()

async def check_breach(email: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{settings.hibp_api_url}/{email.strip().lower()}",
                headers={"hibp-api-key": settings.hibp_api_key}
            )
            
            if response.status_code == 404:
                return {"is_breached": False, "breach_count": 0, "breaches": []}
            
            response.raise_for_status()
            breaches = response.json()
            return {
                "is_breached": len(breaches) > 0,
                "breach_count": len(breaches),
                "breaches": [b["Name"] for b in breaches]
            }
        except Exception:
            print("[breach_service] Error checking breach (email masked)")
            return {"is_breached": False, "breach_count": 0, "error": "External service error"}
