# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses a course-release cadence rather than semantic production versioning.

## [Unreleased]

### Added

- MIT license, contributing guide, and security policy
- GitHub Actions CI (Python compile/lint, frontend production build)
- Reproducible frontend lockfile (`package-lock.json`) and Node 20 pin (`.nvmrc`)
- Research-style README with Mermaid architecture diagrams and UI screenshots

### Fixed

- Vite `@` alias resolution on paths that contain spaces (`fileURLToPath`)

## [0.1.0] — 2026-09

### Added

- Eight FastAPI microservices behind an API Gateway
- React operator portal (Vite + TypeScript)
- Docker Compose stack (PostgreSQL, Redis, Kafka, MinIO)
- Config-driven state machines and approval workflows
- Transactional outbox to Kafka for notification and audit fan-out
- Course report and service / team documentation under `docs/`
