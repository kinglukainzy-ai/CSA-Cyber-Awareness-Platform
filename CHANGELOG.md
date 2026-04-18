# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-04-18

### Added
- JWT blacklisting — Redis-backed token revocation during logout and session termination
- Participant session binding — required `X-Session-Code` header on participant endpoints
- Dead Letter Queue (DLQ) — task logging for failed Celery worker background operations
- On-demand URL signing — short-lived MinIO presigned URLs for report distribution
- Redis authentication — password protection for production Redis instances
- Socket.io hardening — mandatory JWT handshake and admin event blocking at the handler level
- Phishing telemetry — added "sent" event tracking to campaign flow for click-rate accuracy

### Fixed
- Environment configuration — fixed casing inconsistencies in Pydantic settings loading
- Report generation — fixed WeasyPrint hanging and MinIO upload failures under concurrent session load
- Timezone awareness — fixed naive datetime.now() across 6 models to use timezone.utc

## [1.0.0] - 2026-04-17

### Added
- Initial release of the CSA Cyber Awareness Platform.
- Core features — phishing simulation, CTF challenges, live polls, and automated reporting
