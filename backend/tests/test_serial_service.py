import re
import pytest
from unittest.mock import patch
import hashlib

def test_serial_determinism():
    """Same inputs always produce the same serial."""
    from app.services.serial_service import generate_serial
    
    challenge_id = "challenge-1"
    participant_id = "participant-1"
    
    serial1 = generate_serial(challenge_id, participant_id)
    serial2 = generate_serial(challenge_id, participant_id)
    
    assert serial1 == serial2
    assert len(serial1) > 0

def test_participant_isolation():
    """Participant A's flag cannot validate for participant B."""
    from app.services.serial_service import generate_serial, decode_serial_to_flag, validate_flag
    
    challenge_id = "challenge-1"
    p1 = "participant-1"
    p2 = "participant-2"
    
    # Generate serial and flag for P1
    s1 = generate_serial(challenge_id, p1)
    f1 = decode_serial_to_flag(s1, challenge_id)
    
    # Validate P1's flag against P2 - should fail
    assert validate_flag(f1, challenge_id, p2) is False
    # Validate P1's flag against P1 - should pass
    assert validate_flag(f1, challenge_id, p1) is True

def test_decoy_failure():
    """Decoy serials produce flags that fail validation against the real serial."""
    from app.services.serial_service import generate_serial, decode_serial_to_flag, validate_flag
    
    challenge_id = "challenge-1"
    p1 = "participant-1"
    
    real_serial = generate_serial(challenge_id, p1)
    
    # Derive a decoy using the same method as serials.py
    decoy_serial = hashlib.sha256(f"{real_serial}:decoy:0".encode()).hexdigest()[:12].upper()
    decoy_flag = decode_serial_to_flag(decoy_serial, challenge_id)
    
    # Validate decoy flag - should fail
    assert validate_flag(decoy_flag, challenge_id, p1) is False

def test_flag_whitespace_stripping():
    """Whitespace in submitted flags gets stripped before comparison."""
    from app.services.serial_service import generate_serial, decode_serial_to_flag, validate_flag
    
    challenge_id = "challenge-1"
    p1 = "participant-1"
    
    real_serial = generate_serial(challenge_id, p1)
    real_flag = decode_serial_to_flag(real_serial, challenge_id)
    
    # Wrap in whitespace
    dirty_flag = f"  {real_flag}  \n"
    
    assert validate_flag(dirty_flag, challenge_id, p1) is True

def test_flag_format():
    """Flag format always matches CSAc{...}."""
    from app.services.serial_service import generate_serial, decode_serial_to_flag
    
    challenge_id = "challenge-1"
    p1 = "participant-1"
    
    serial = generate_serial(challenge_id, p1)
    flag = decode_serial_to_flag(serial, challenge_id)
    
    assert re.match(r'^CSAc\{.+\}$', flag) is not None
