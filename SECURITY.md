# Security Policy

## Security Hardening (v1.1.1)

In version 1.1.1, we have implemented several critical security enhancements to ensure production readiness:

### 1. JWT Revocation & Blacklisting
The platform now supports real-time token revocation. When a user logs out or an administrator terminates a session, the associated JWT (identified by its `jti` claim) is blacklisted in Redis with a TTL matching the token's remaining expiry. All authenticated endpoints and socket connections verify the blacklist status during every request/handshake.

### 2. Participant Session Binding
To prevent cross-session data leakage and unauthorized access, all participant-facing endpoints now require a mandatory `X-Session-Code` header. This header is validated against the database to ensure the participant is active within the specified session.

### 3. Redis Authentication
Redis instances are now password-protected by default. The `REDIS_PASSWORD` environment variable must be configured in production to allow the backend and workers to communicate with the cache/broker.

### 4. Socket.io Handshake Hardening
The Socket.io gateway has been hardened to require a valid JWT during the initial handshake. Connection attempts without a valid token or with a blacklisted token are rejected before a websocket connection is established. Additionally, sensitive events (e.g., `start_phishing`, `unlock_challenge`) are restricted to users with `admin` claims at the socket handler level.

---

## Supported Versions

Only the latest `main` branch of this platform is currently supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Cyber Security Authority (CSA) Ghana takes the security of its infrastructure and platforms seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:
**lquansah.intern@csa.gov.gh**

Please include the following in your report:

- Type of issue (e.g., SQL injection, XSS, etc.)
- The location of the issue (URL, endpoint, or specific file)
- A detailed description of the issue
- Steps to reproduce the issue
- Potential impact

We will acknowledge receipt of your report within 48 hours and provide a timeline for resolution if the issue is confirmed.
