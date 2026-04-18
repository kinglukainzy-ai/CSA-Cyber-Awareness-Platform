# CSA Cyber Awareness Platform

A comprehensive, live-session cybersecurity training platform built for Ghana's Cyber Security Authority (CSA). This platform enables instructors to run real-time phishing simulations, CTF challenges, live polls, and automated impact reporting.

---

---

## Prerequisites

Before running the platform, ensure you have:
- **Docker** and **Docker Compose V2** installed.
- **Port 80/443** open on your server firewall.
- **OpenSSL** (for secret generation).

- **Domain Name** (Optional, DuckDNS is supported natively).

---

## Deployment (Linux)

Our interactive setup tool handles dependency checks, TLS certificate provisioning (Certbot), and full stack orchestration.

```bash
chmod +x install.sh
sudo ./install.sh
```

## Deployment (Windows)

We provide a native PowerShell orchestrator that integrates with Windows Task Scheduler for certificate auto-renewal.

```powershell
Set-ExecutionPolicy RemoteSigned -Scope Process
.\install.ps1
```

---

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion.
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0.
- **Real-time**: Socket.io (Hardened with JWT handshake and admin-only event blocking).
- **Infrastructure**: Traefik (Edge Proxy), Certbot (TLS), Docker Compose, Redis, PostgreSQL.
- **Reporting**: WeasyPrint (PDF Gen) and MinIO (S3-compatible storage).

---

## Project Structure

- `/frontend`: Next.js application for Admin and Participant dashboards.
- `/backend`: FastAPI service handling business logic, websockets, and background tasks.
- `/traefik`: Proxy configuration for routing and TLS (in production).
- `install.sh`: Automation script for one-click setup.
- `docker-compose.yml`: Full stack orchestration.

---

## Maintenance & Monitoring

The deployment scripts automatically configure automated renewals, but you can manage them manually using these helpers:

- **Linux**:
  - `/renew-cert.sh`: Force certificate renewal.
  - `/check-cert.sh`: Verify certificate status and expiry.
- **Windows**:
  - `.\renew-cert.ps1`: Manual renewal (stops/starts Traefik).
  - `.\check-cert.ps1`: Status dashboard.

## Security Hardening

This platform implements several production-grade security measures:
- **Socket.io Authentication**: Mandatory JWT handshake; unauthorized connections are rejected before connecting.
- **Role-Based Handlers**: Sensitive instructor actions (ending sessions, launching polls) are blocked at the socket level if the user lacks admin claims.
- **Ephemeral Secrets**: Installers auto-generate unique `JWT_SECRET` and `SERIAL_SECRET` for every deployment.

- **Token Security**: Default JWT access tokens expire after 30 minutes.
- **JWT Revocation**: Real-time token blacklisting via Redis during logout or administrative session termination.
- **Participant Isolation**: All participant endpoints require a valid `X-Session-Code` header, binding the client to a specific training instance.

---

## Core Features

- **Real-time Command Center**: Live telemetry feed from participants and manual challenge progression.
- **Phishing Engine**: Sandboxed template preview and real-time click/open tracking.
- **Breach Scout**: HIBP-integrated identity exposure checking (K-anonymity).
- **Automated Reporting**: Generates 6-section professional impact reports for organizations.
- **Challenge Library**: Centralized repository for Missions, Scenarios, and Quizzes.

---

## Breaking API Changes (v1.1.1)

All participant-facing endpoints (e.g., `/api/v1/participants/*`) now require the `X-Session-Code` header. Requests without this header will be rejected with a `400 Bad Request`.

---

## Data Persistence

All data is persisted via named Docker volumes:
- `postgres_data`: Stores all mission data, participant telemetry, and templates.
- `minio_data`: Stores generated PDF reports.
- `redis_data`: Persists rate-limiting and socket session state.

---

## Contributing

1. Create a `.env` file from `.env.example`.
2. Ensure you have Docker and Docker Compose installed.
3. For local backend development without Docker, use `uvicorn app.main:socket_app --reload`.

4. For frontend development, use `npm run dev` in the `/frontend` directory.

---

## License

Proprietary - Developed for the Cyber Security Authority, Ghana.
