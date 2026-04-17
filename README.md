# CSA Cyber Awareness Platform

A comprehensive, live-session cybersecurity training platform built for Ghana's Cyber Security Authority (CSA). This platform enables instructors to run real-time phishing simulations, CTF challenges, live polls, and automated impact reporting.

---

## Quick Start (Local Setup)

The easiest way to launch the platform is using the automated install script. This will configure environment variables, build the Docker stack, and seed the database.

```bash
chmod +x install.sh
./install.sh
```

Once completed, access the platform at:
- **Frontend**: [http://localhost](http://localhost)
- **API Health**: [http://localhost/health](http://localhost/health)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001)

---

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion.
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0, Pydantic v2.
- **Real-time**: Socket.io for live telemetry and instructor controls.
- **Infrastructure**: Traefik (Edge Proxy), Docker Compose, Redis (State/Broker), PostgreSQL.
- **Reporting**: WeasyPrint for automated PDF generation and MinIO for storage.

---

## Project Structure

- `/frontend`: Next.js application for Admin and Participant dashboards.
- `/backend`: FastAPI service handling business logic, websockets, and background tasks.
- `/traefik`: Proxy configuration for routing and TLS (in production).
- `install.sh`: Automation script for one-click setup.
- `docker-compose.yml`: Full stack orchestration.

---

## Core Features

- **Real-time Command Center**: Live telemetry feed from participants and manual challenge progression.
- **Phishing Engine**: Sandboxed template preview and real-time click/open tracking.
- **Breach Scout**: HIBP-integrated identity exposure checking (K-anonymity).
- **Automated Reporting**: Generates 6-section professional impact reports for organizations.
- **Challenge Library**: Centralized repository for Missions, Scenarios, and Quizzes.

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
