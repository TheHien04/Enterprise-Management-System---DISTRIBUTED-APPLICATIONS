# Architecture

Enterprise Business Management System for Logistics ABC — microservices monorepo.

## System context

```
┌─────────────┐     HTTPS      ┌──────────────┐
│  Web Client │ ─────────────► │ API Gateway  │
│  (React)    │                │ JWT + Proxy  │
└─────────────┘                └──────┬───────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
  Contract (8001)              Workflow (8005)               Billing (8004)
  Pricing (8002)               Notification (8006)           Operation (8003)
                               Audit (8007)                  E-Sign (8008)
        │                             │                             │
        └──────────────┬──────────────┴──────────────┬──────────────┘
                       ▼                             ▼
                 PostgreSQL                      Kafka + Redis
              (database-per-service)            (events, cache)
```

## Design principles

| Principle | Implementation |
|-----------|----------------|
| **Database per service** | 6 PostgreSQL databases — see `infra/postgres/init-databases.sql` |
| **No cross-DB joins** | Logical UUID links; sync via REST or Kafka events |
| **Config-driven workflow** | No hard-coded approval if/else — `config/workflow_definitions.json` |
| **State machines** | `udpt_common.StateMachine` + `config/state_machines.json` |
| **Thin controllers** | Routes → Services → Repositories |
| **Async side effects** | Outbox → Kafka → Notification / Audit / E-Sign |
| **API versioning** | All REST under `/api/v1` |
| **Security** | JWT at gateway; assignee check in workflow (APR-01) |

## Request flow

1. Client calls Gateway with `Authorization: Bearer <JWT>`.
2. Gateway validates token, forwards to target service with `X-User-Id`, `X-User-Roles`.
3. Service executes domain logic, persists to its DB.
4. Domain events written to outbox (same transaction) → worker publishes to Kafka.
5. Consumer services update read models / send notifications.

## Service boundaries

See **[docs/SERVICE_MAP.md](./docs/SERVICE_MAP.md)** for the team navigation index.

## Related documents

- [Assignment spec](./docs/QTKD_DATH.pdf)
- [Sample data](./docs/Data%20sample.pdf)
- [Contributing guide](../CONTRIBUTING.md)
