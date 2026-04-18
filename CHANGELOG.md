# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-04-18

### Added
- **JWT Blacklisting**: Redis-backed token revocation for secure logout and administrative session termination.
- **Participant Session Binding**: Mandatory `X-Session-Code` header for all participant-facing endpoints to prevent cross-session access.
- **Dead Letter Queue (DLQ)**: Robust background task monitoring and failure logging for Celery workers.
- **On-Demand URL Signing**: Short-lived MinIO presigned URLs for secure report distribution.
- **Redis Authentication**: Password protection for Redis instances in production.
- **Socket.io Hardening**: Mandatory JWT handshake and administrative event blocking.
- **Phishing Telemetry**: Added "sent" event tracking to the phishing simulation flow for improved accuracy in click-rate calculations.

### Fixed
- **Environment Configuration**: Fixed casing inconsistencies in environment variable loading.
- **Report Generation**: Resolved issues with PDF rendering and storage during high-concurrency sessions.
- **Timezone Awareness**: Ensured all database timestamps are timezone-aware for consistent regional reporting.

## [1.0.0] - 2026-04-17

### Added
- Initial release of the CSA Cyber Awareness Platform.
- Core features: Phishing Simulation, CTF Challenges, Live Polls, and Automated Reporting.
