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
              (database-per-service)     (events, idempotency, rate limit)
```

## Design principles

| Principle | Implementation |
|-----------|----------------|
| **Database per service** | 6 PostgreSQL databases — see `infra/postgres/init-databases.sql` |
| **No cross-DB joins** | Logical UUID links; sync via REST or Kafka events |
| **Config-driven workflow** | No hard-coded approval if/else — `config/workflow_definitions.json` |
| **State machines** | `udpt_common.StateMachine` + `config/state_machines.json` |
| **Thin controllers** | Routes → Services → Repositories |
| **Transactional outbox** | Domain events written to `outbox_events` in the same DB transaction; relay worker publishes to Kafka (`udpt_common/outbox.py`) |
| **Async side effects** | Outbox → Kafka → Notification / Audit (no duplicate HTTP notify) |
| **API versioning** | All REST under `/api/v1` |
| **Security** | JWT at gateway; RBAC by role + **assignee user id** in workflow (APR-01); Redis rate limit |
| **Idempotency** | Redis `X-Idempotency-Key` at gateway |
| **Expiry alerts** | Background scheduler in contract-service (contracts + price lists within 30 days) |

## Request flow

1. Client calls Gateway with `Authorization: Bearer <JWT>`.
2. Gateway validates token, applies rate limit, forwards to target service with `X-User-Id`, `X-User-Roles`.
3. Service executes domain logic, persists to its DB.
4. Domain events enqueued to **outbox** (same transaction) → background relay publishes to Kafka.
5. Consumer services (Notification, Audit) process events; HTTP notification fallback if Kafka temporarily unavailable.

## Service boundaries

See **[docs/SERVICE_MAP.md](./SERVICE_MAP.md)** for the team navigation index.

## Related documents

- [Team assignment (chi tiết phân công)](./TEAM_ASSIGNMENT.md)
- [Demo script bảo vệ](./DEMO.md)
- [Defense Q&A](./DEFENSE_GUIDE.md)
- [Request flows (sequence diagrams)](./REQUEST_FLOWS.md)
- [Assignment spec](./QTKD_DATH.pdf)
- [Sample data](./Data%20sample.pdf)
- [Contributing guide](../CONTRIBUTING.md)
