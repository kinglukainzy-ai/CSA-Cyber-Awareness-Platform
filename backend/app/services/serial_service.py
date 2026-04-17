import hmac
import hashlib
import base64
from app.config import settings

def generate_serial(challenge_id: str, participant_id: str) -> str:
    """Deterministic — same inputs always produce same serial."""
    payload = f"{challenge_id}:{participant_id}"
    sig = hmac.new(
        settings.serial_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).digest()
    # Base32 for safe display, first 10 bytes is enough for 16 chars (or 12-16 depending on padding)
    # The prompt says "12-char base32 serial" in the definition of done.
    # Base32 encoding 7.5 bytes gives 12 chars. 10 bytes gives 16 chars.
    # Let's see: sig[:10] encoded in base32 is 16 chars. Sig[:7.5] is 12 chars.
    # Let's use sig[:10] as requested in the logic snippet, but trailing = trimmed.
    return base64.b32encode(sig[:10]).decode().rstrip("=")

def decode_serial_to_flag(serial: str, challenge_id: str) -> str:
    """Always returns a CSAc{...} string. Both real and decoy serials produce one."""
    h = hashlib.sha256(f"{serial}:{challenge_id}".encode()).hexdigest()[:24]
    return f"CSAc{{{h}}}"

def validate_flag(submitted: str, challenge_id: str, participant_id: str) -> bool:
    """Backend only. Recomputes expected flag and compares in constant time."""
    correct_serial = generate_serial(challenge_id, participant_id)
    expected = decode_serial_to_flag(correct_serial, challenge_id)
    return hmac.compare_digest(submitted.strip(), expected)
