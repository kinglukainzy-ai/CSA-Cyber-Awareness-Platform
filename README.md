# CSA Cyber Awareness Platform

A live-session cybersecurity training platform built for Ghana's Cyber Security Authority (CSA). Instructors use this to run real-time phishing simulations, CTF challenges, live polls, and automated impact reporting.

---

---

## Prerequisites

You need:
- Docker and Docker Compose V2 installed.
- Port 80/443 open on your server firewall.
- OpenSSL to generate secrets.
- A domain name (DuckDNS is supported natively).

---

## Linux Deployment

The setup tool handles dependency checks, TLS certificate provisioning via Certbot, and stack orchestration.

```bash
chmod +x install.sh
sudo ./install.sh
```

## Windows Deployment

The PowerShell orchestrator integrates with Windows Task Scheduler for certificate auto-renewal.

```powershell
Set-ExecutionPolicy RemoteSigned -Scope Process
.\install.ps1
```

---

## Technology Stack

The stack uses Next.js 14 and Tailwind for the UI, with a FastAPI and SQLAlchemy 2.0 backend. Real-time updates use Socket.io with JWT handshakes and admin-only event blocking. Infrastructure is managed via Traefik, Certbot, Docker Compose, Redis, and PostgreSQL. PDF reports are generated with WeasyPrint and stored in MinIO.

---

## Project Structure

- `/frontend`: Next.js application for Admin and Participant dashboards.
- `/backend`: FastAPI service handling business logic, websockets, and background tasks.
- `/traefik`: Proxy configuration for routing and TLS (in production).
- `install.sh`: Automation script for one-click setup.
- `docker-compose.yml`: Full stack orchestration.

---

## Maintenance and Monitoring

Deployment scripts configure renewals, but you can manage them manually using these helpers:

- Linux: `/renew-cert.sh` and `/check-cert.sh`
- Windows: `.\renew-cert.ps1` and `.\check-cert.ps1`

## Security

The platform uses these security measures:
- Socket.io uses mandatory JWT handshakes to reject unauthorized connections before they start.
- Instructor actions like ending sessions or launching polls are blocked at the socket level without admin claims.
- Installers generate unique `JWT_SECRET` and `SERIAL_SECRET` for each deployment.
- JWT access tokens expire after 30 minutes by default.
- Tokens are blacklisted in Redis during logout or session termination.
- Participant endpoints require an `X-Session-Code` header to bind the client to a training instance.

---

## Features

- Real-time command center with live participant telemetry and challenge progression.
- Phishing engine with sandboxed previews and click/open tracking.
- Breach Scout for HIBP identity exposure checks using k-anonymity.
- Automated 6-section impact reports for organizations.
- Challenge library for missions, scenarios, and quizzes.

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
