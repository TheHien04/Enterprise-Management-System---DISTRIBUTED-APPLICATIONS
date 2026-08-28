# Contributing Guide

## Branch naming

```
feature/<service>-<short-description>
fix/<service>-<issue>
docs/<topic>
```

Examples: `feature/contract-submit-validation`, `feature/workflow-engine`

## Service ownership (suggested)

| Member | Primary focus |
|--------|---------------|
| Member 1 | Contract Service + Gateway auth |
| Member 2 | Pricing + Operation services |
| Member 3 | Billing + Workflow services |
| Member 4 | Notification + Audit + E-Sign + Frontend |

Adjust among your team as needed.

## Backend conventions

Each microservice follows the same layout:

```
app/
├── api/v1/          # Route handlers (thin)
├── core/            # Config, dependencies
├── models/          # SQLAlchemy models
├── schemas/         # Pydantic request/response
├── services/        # Business logic
├── repositories/    # DB access
└── db/              # Session, base
```

Rules:
- Business logic in `services/`, not in routes
- Use `udpt_common.StateMachine` for status transitions
- Publish events via Outbox (TODO)
- Validate business rules from assignment (CTR, PRC, PAY, APR)

## Frontend conventions

```
src/
├── api/             # API client functions
├── components/      # Reusable UI
├── pages/           # Route pages
├── routes/          # React Router config
├── context/         # Global state (auth)
└── types/           # TypeScript types
```

- Use `@/` path alias for imports
- One page folder per module (customers, contracts, ...)
- Connect to Gateway at `VITE_API_BASE_URL`

## Commit messages

```
feat(contract): add contract submit validation CTR-02
fix(workflow): prevent double approve SC-05
docs(readme): update setup instructions
```

## Before opening PR

- [ ] Service starts locally (`uvicorn` or Docker)
- [ ] `/health` returns OK
- [ ] Swagger docs updated if API changed
- [ ] No secrets committed (use `.env`)
