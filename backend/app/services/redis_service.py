import redis
from app.config import settings

def get_redis_client():
    return redis.Redis.from_url(
        settings.redis_url,
        password=settings.redis_password,
        decode_responses=True
    )

def blacklist_token(jti: str, exp: int):
    client = get_redis_client()
    import time
    ttl = int(exp - time.time())
    if ttl > 0:
        client.setex(f"blacklist:{jti}", ttl, "true")

def is_token_blacklisted(jti: str) -> bool:
    client = get_redis_client()
    return client.exists(f"blacklist:{jti}") > 0
