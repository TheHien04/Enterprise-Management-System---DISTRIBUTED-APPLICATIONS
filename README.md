# Enterprise Management System — Logistics ABC

[![Repo](https://img.shields.io/badge/GitHub-Enterprise--Management--System-blue)](https://github.com/TheHien04/Enterprise-Management-System)

Distributed business management system for **Logistics ABC Corporation**, built with **FastAPI microservices** + **React/Vite/TypeScript** + **Docker Compose** — developed for the **Distributed Applications (UDPT)** course.

> **New to the repo?** Start at **[docs/SERVICE_MAP.md](./docs/SERVICE_MAP.md)** — find your module in 30 seconds.

## Team

- Nguyen The Hien — 22127107
- Le Quang Tan — 22127378
- Bui Le Khoi — 22127205
- Nguyen Minh Hieu — 21127742

## Architecture

```
frontend (5173) → api-gateway (8080) → microservices (8001–8008)
                                      ↘ postgres / redis / kafka / minio
```

| Service | Port | Database | Responsibility |
|---------|------|----------|----------------|
| API Gateway | 8080 | — | JWT, routing, idempotency |
| Contract | 8001 | contract_db | Customers, contracts, appendices |
| Pricing | 8002 | pricing_db | Service catalog, price lists |
| Operation | 8003 | operation_db | Volumes, period locking |
| Billing | 8004 | billing_db | Billing sheets, snapshots |
| Workflow | 8005 | workflow_db | Approval engine |
| Notification | 8006 | support_db | Async notifications |
| Audit | 8007 | support_db | Audit logs |
| E-Sign | 8008 | support_db | Digital signing |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (frontend local dev)
- Python 3.11+ (backend local dev)

### 1. Clone & configure

```bash
cp .env.example .env
```

### 2. Start everything

```bash
make up
```

### 3. Access

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Frontend |
| http://localhost:8080/docs | API Gateway Swagger |
| http://localhost:8001/docs | Contract Service Swagger |
| http://localhost:9001 | MinIO Console |

### Demo login

| User | Password | Role |
|------|----------|------|
| sale01 | sale01 | Sales Staff |
| manager01 | manager01 | Sales Manager |
| director01 | director01 | Director |
| admin01 | admin01 | Admin |

## Project Structure

```
.
├── backend/
│   ├── gateway/                 # JWT auth + API routing
│   ├── libs/udpt_common/        # Shared Python library
│   └── services/                # 8 domain microservices
├── frontend/                    # React + Vite + TypeScript
├── config/                      # State machines, workflows, seed data
├── docs/                        # Architecture, SERVICE_MAP, assignment PDFs
├── infra/                       # Postgres init, K8s placeholder
├── docker-compose.yml
└── Makefile
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/SERVICE_MAP.md](./docs/SERVICE_MAP.md) | Which folder for which UC |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design overview |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Branch naming, PR flow |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for conventions.

## Next Steps

- [ ] Contract Service: models + CRUD + state machine
- [ ] Workflow Service: config-driven engine
- [ ] Billing Service: price snapshot logic
- [ ] Kafka consumers: notification, audit, esign
- [ ] Frontend: connect pages to API
- [ ] Kubernetes manifests
- [ ] Integration tests SC-01 → SC-10
