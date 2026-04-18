import redis
from app.config import settings

# Single client instance for the entire application
_client = redis.from_url(
    settings.redis_url,
    password=settings.redis_password,
    decode_responses=True
)

def blacklist_token(jti: str, exp: int):
    import time
    ttl = int(exp - time.time())
    if ttl > 0:
        _client.setex(f"blacklist:{jti}", ttl, "true")

def is_token_blacklisted(jti: str) -> bool:
    return _client.exists(f"blacklist:{jti}") > 0
