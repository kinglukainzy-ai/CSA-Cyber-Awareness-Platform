This document covers the architecture, features, and operations of the CSA Ghana Cyber Awareness Platform for developers.

---


## Project Context

- Primary users: CSA Admins and Instructors.
- Participants: Ephemeral workgroup members join via a session code.
- Goal: Measure and improve organizational cybersecurity posture through active engagement.

---


## Technology Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion, Monaco Editor.
- Backend: FastAPI, SQLAlchemy 2.0, Pydantic v2.
- Databases and State: 
    - PostgreSQL 15 (Primary Production Store)
    - Redis 7 (Socket.io state, Celery broker, Rate limiting, JWT Blacklist) — *authenticated in production*
    - MinIO (Local S3 storage for PDF reports)
- Real-time: Socket.io for live dashboard updates.
- Background Workers: Celery with Redis for email delivery and report compilation.
    - Reliability: Dead Letter Queue (DLQ) task logging captures failed background operations.

- Infrastructure: Traefik, Docker Compose, Cloudflare Tunnels (Zero Trust ingress).

---

### Real-time Instruction Dashboard

The Command Center supports two modes:

- Setup Mode: Mission pipeline management, organization configuration, and launch preparation.
- Live Mode: Real-time telemetry feed from participants, manual challenge unlocking, live polling, and phishing simulation tracking.

### Phishing Simulation Engine

- Tracking System: Uses 1x1 transparent pixels for email opens and redirectors for clicks. 
- Telemetry: Events (Sent, Open, Click, Submit) are logged and broadcasted to the instructor dashboard.
- Reliability: Tracking endpoints use silent-fail logic to return the pixel or redirect even if logging fails.

### Live Poll System

- **Engagement**: Instructors can launch interactive polls that overlay the participant dashboard.
- **Visualization**: Live, animated bar charts for both instructors and participants upon completion.

### Identity Protection (Breach Scout)

- **HIBP Integration**: Uses the HaveIBeenPwned k-anonymity API (SHA-1 prefixing) to check for exposures without sending full emails to third parties.
- **Events**: Every check is logged per participant for include in the final organizational report.

### Library and Content Management

- Challenge Library: Centralized mission repository with a Monaco-based JSON editor and templates for scenarios, CTF, quizzes, and decisions.
- Phishing Manager: Template library with a sandboxed HTML preview modal for placeholder replacement.


### Automated Impact Reporting

- PDF Engine: Professional 6-section reports generated via HTML/CSS templates and WeasyPrint.
- On-Demand Signing: Reports use short-lived (1 hour) presigned MinIO URLs for authorized access.

- Reporting Hub: Viewer with auto-polling for generation status and a summary snapshot of Awareness Score, Click Rate, and Breach Exposure.

---

## 4. Operational Instructions

### Production Deployment (Docker)
Ensure your `.env` file contains the required secrets (`CLOUDFLARE_TUNNEL_TOKEN`, `DOMAIN`, `SERIAL_SECRET`).

1. **Launch Stack**:
   ```bash
   docker-compose up -d --build
   ```
2. **Execute Migrations**:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```
3. **Seed Baseline Data**:
   ```bash
   docker-compose exec backend python app/db/seeds.py
   ```


### Local Development

- **Backend**:
   ```bash
   cd backend && pip install -r requirements.txt
   PYTHONPATH=. uvicorn app.main:socket_app --reload
   ```
2. **Frontend**:
   ```bash
   cd frontend && npm install && npm run dev
   ```

---

## 5. Current Project Status (Phase 7 Complete)

✅ **Phase 1-2**: Auth, Session CRUD, and Control Room.
✅ **Phase 3**: Scoring, HMAC Serials, and Hint UI.
✅ **Phase 4**: Breach Scout & 6-Section PDF Reporting.
✅ **Phase 5**: SQLite Compatibility & Production Baseline.
✅ **Phase 6**: Live Dashboard, Phishing Tracker, and Production Infrastructure.
✅ **Phase 7**: Participant End Experience, Library Management, and Reporting Enhancements.

---

## Security Principles

- Rate Limiting: `slowapi` enforces limits on Join, Breach Check, and Flag Submit endpoints.
- HMAC Serials: Unique flags per participant prevent answer leakage.
- Conflict Prevention: Template deletion is blocked if referenced by active campaigns.
- Isolation: Participants have no access to administrative endpoints; context is validated via headers.

---

## 7. Known Environment Quirks
- **Socket.io**: In local development, ensure the `NEXT_PUBLIC_SOCKET_URL` matches the backend listener (usually `http://localhost:8000`).
- **PDF Storage**: Reports are stored in MinIO. Ensure the `MINIO_ENDPOINT` is accessible by both the `backend` and `worker` services.
