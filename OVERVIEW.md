# CSA Cyber Awareness Platform - Developer Overview

This document provides a comprehensive overview of the CSA Ghana Cyber Awareness Platform, covering the architecture, implemented features, and operational instructions. It is intended to allow a new developer to understand the state of the project and continue development immediately.

---

## 1. Project Context
The platform is a live, session-based cybersecurity training tool for Ghana's Cyber Security Authority (CSA). It features instructor-led phishing simulations, CTF challenges, live polls, and automated impact reporting.

- **Primary Users**: CSA Admins/Instructors.
- **Participants**: Ephemeral workgroup members who join via a session code.
- **Goal**: Measure and improve organizational cybersecurity posture through active engagement.

---

## 2. Technology Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Framer Motion (Animations), Monaco Editor (Tactical Editing).
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 (Async), Pydantic v2.
- **Databases & State**: 
    - **PostgreSQL 15** (Primary Production Store)
    - **Redis 7** (Socket.io state, Celery broker, Rate limiting)
    - **MinIO** (Local S3 storage for PDF reports)
- **Real-time**: Socket.io (via `python-socketio`) for live dashboard updates.
- **Background Workers**: Celery with Redis for email delivery and report compilation.
- **Infrastructure**: Traefik (Edge Proxy), Docker Compose, Cloudflare Tunnels (Zero Trust ingress).

---

## 3. Core Architecture & Services

### Real-time Instruction Dashboard

The "Command Center" (`/admin/sessions/[id]`) supports two modes:

- **Setup Mode**: Mission pipeline management via drag-and-drop, organization configuration, and launch preparation.
- **Live Mode**: Real-time telemetry feed from participants, manual challenge unlocking, live polling, and phishing simulation tracking.

### Phishing Simulation Engine

- **Tracking System**: Uses 1x1 transparent pixels for email opens and hardened redirectors for clicks. 
- **Telemetry**: All events (Open, Click, Submit) are logged to the database and broadcasted in real-time to the instructor dashboard.
- **Reliability**: Tracking endpoints implement "silent-fail" logic, prioritizing the return of the tracking pixel/redirect even if database logging fails.

### Live Poll System

- **Engagement**: Instructors can launch interactive polls that overlay the participant dashboard.
- **Visualization**: Live, animated bar charts for both instructors and participants upon completion.

### Identity Protection (Breach Scout)

- **HIBP Integration**: Uses the HaveIBeenPwned k-anonymity API (SHA-1 prefixing) to check for exposures without sending full emails to third parties.
- **Events**: Every check is logged per participant for include in the final organizational report.

### Library & Content Management
- **Challenge Library**: Centralized repository for missions with a Monaco-based JSON editor and schema-aware templates for Scenario, CTF, Quiz, and Decision types.
- **Phishing Manager**: Template library with a live, sandboxed HTML preview modal that simulates placeholder replacement for `{{CLICK_URL}}` and `{{OPEN_URL}}`.

### Automated Impact Reporting
- **PDF Engine**: Professional 6-section report generated via HTML/CSS templates and WeasyPrint.
- **Reporting Hub**: Dedicated viewer with auto-polling for generation status and a summary snapshot showing Awareness Score, Click Rate, and Breach Exposure at a glance.

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
1. **Backend**:
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

## 6. Security Principles
- **Rate Limiting**: `slowapi` enforces limits on sensitive endpoints (Join, Breach Check, Flag Submit).
- **HMAC Serials**: Unique flags per participant to prevent answer leakage.
- **Conflict Prevention**: Template deletion is blocked if referenced by active campaigns to maintain data integrity.
- **Isolation**: Participants have no direct access to administrative endpoints; session context is strictly validated via headers.

---

## 7. Known Environment Quirks
- **Socket.io**: In local development, ensure the `NEXT_PUBLIC_SOCKET_URL` matches the backend listener (usually `http://localhost:8000`).
- **PDF Storage**: Reports are stored in MinIO. Ensure the `MINIO_ENDPOINT` is accessible by both the `backend` and `worker` services.
