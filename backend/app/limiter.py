import ipaddress
from fastapi import Request
from slowapi import Limiter

TRUSTED_PROXY_NETWORKS = [
    ipaddress.ip_network("172.16.0.0/12")
]

def get_client_ip(request: Request) -> str:
    """
    Extracts the real client IP.
    If the remote address is from a trusted proxy (Docker network),
    it looks at X-Forwarded-For.
    """
    remote_addr_str = request.scope.get("client", ["127.0.0.1"])[0]
    
    try:
        remote_addr = ipaddress.ip_address(remote_addr_str)
    except ValueError:
        return remote_addr_str

    is_trusted = any(remote_addr in net for net in TRUSTED_PROXY_NETWORKS)
    
    if is_trusted:
        xff = request.headers.get("X-Forwarded-For")
        if xff:
            # Returns the first IP in the chain
            return xff.split(",")[0].strip()
            
    return remote_addr_str

limiter = Limiter(key_func=get_client_ip)
