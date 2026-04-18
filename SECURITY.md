# Security Policy

## Security Hardening (v1.1.1)

In version 1.1.1, we implemented security enhancements for production readiness:

### JWT Revocation and Blacklisting
The platform supports real-time token revocation. When a user logs out or an administrator terminates a session, the JWT is blacklisted in Redis. Authenticated endpoints and socket connections verify the blacklist status during every request.

### Participant Session Binding
All participant-facing endpoints require an `X-Session-Code` header to prevent data leakage. This header is validated against the database to ensure the participant is active in the specified session.

### Redis Authentication
Redis instances are password-protected. Configure the `REDIS_PASSWORD` environment variable in production to allow backend and workers to communicate with the cache and broker.

### Socket.io Handshake Hardening
The Socket.io gateway requires a valid JWT during the handshake. Connections without a valid or blacklisted token are rejected before they establish. Sensitive events are restricted to users with `admin` claims at the socket handler level.

---

## Supported Versions

Only the latest `main` branch of this platform is currently supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Cyber Security Authority (CSA) Ghana takes security seriously. If you find a security vulnerability, please report it to us responsibly. 

**Do not report vulnerabilities through public GitHub issues.**

Report via email to: **lquansah.intern@csa.gov.gh**

Please include the following in your report:

- Type of issue (e.g., SQL injection, XSS, etc.)
- The location of the issue (URL, endpoint, or specific file)
- A detailed description of the issue
- Steps to reproduce the issue
- Potential impact

We will acknowledge receipt of your report within 48 hours and provide a timeline for resolution if the issue is confirmed.
