# Service Map — Where to Code

Use this file to jump directly to your module. Each row links **use case → service → folder → API prefix**.

## Quick index

| If you work on… | Go to folder | Gateway route | Port |
|-----------------|--------------|---------------|------|
| Customers, contracts, appendices | `backend/services/contract-service/` | `/api/v1/customers`, `/api/v1/contracts` | 8001 |
| Service catalog, price lists | `backend/services/pricing-service/` | `/api/v1/pricing/*` | 8002 |
| Volume records, period lock | `backend/services/operation-service/` | `/api/v1/operations/*` | 8003 |
| Billing sheets, snapshots | `backend/services/billing-service/` | `/api/v1/billing/*` | 8004 |
| Approval workflow engine | `backend/services/workflow-service/` | `/api/v1/workflows/*` | 8005 |
| User notifications | `backend/services/notification-service/` | `/api/v1/notifications/*` | 8006 |
| Audit trail | `backend/services/audit-service/` | `/api/v1/audit/*` | 8007 |
| E-sign integration | `backend/services/esign-service/` | `/api/v1/esign/*` | 8008 |
| Login, JWT, routing | `backend/gateway/` | `/api/v1/auth/login` | 8080 |
| Web UI | `frontend/src/pages/` | — | 5173 |

---

## Backend — layer convention (every service)

```
app/
├── api/v1/           ← HTTP routes (thin — delegate to services)
├── core/             ← config, dependencies
├── domain/           ← enums, state machines, business constants
├── models/           ← SQLAlchemy ORM
├── schemas/          ← Pydantic request/response DTOs
├── services/         ← business logic (main work happens here)
├── repositories/     ← database queries
└── db/               ← session, base, migrations
```

**Rule:** Routes must not contain business rules. Put rules in `services/` and validate with `udpt_common.StateMachine`.

---

## Contract Service (`contract-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-01 Customer management | 4.1 | `app/api/v1/customers.py` → `app/services/customer_service.py` |
| UC-02 Contract lifecycle | 4.2 | `app/api/v1/contracts.py` → `app/services/contract_service.py` |
| UC-03 Contract appendix | 4.3 | `app/api/v1/appendices.py` (TODO) |

**State machine:** `config/state_machines.json` → `contract`, `appendix`  
**Rules:** CTR-01 → CTR-07  
**DB:** `contract_db` — tables: `customers`, `contracts`, `contract_appendices`, `contract_attachments`

---

## Pricing Service (`pricing-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-04 Price lists & overlap | 4.4 | `app/api/v1/price_lists.py` (TODO) |

**State machine:** `config/state_machines.json` → `price_list`  
**Rules:** PRC-01 → PRC-06, **SC-02**  
**DB:** `pricing_db` — tables: `services`, `price_lists`, `price_list_items`

---

## Operation Service (`operation-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-05 Volume & period lock | 4.5 | `app/api/v1/volumes.py` (TODO) |

**State machine:** `volume_period`  
**Rules:** VOL-01 → VOL-04  
**DB:** `operation_db` — tables: `billing_periods`, `volume_records`

---

## Billing Service (`billing-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-06 Payment slip + snapshot | 4.6 | `app/api/v1/billing_sheets.py` (TODO) |

**State machine:** `billing_sheet` (3 axes: approval, signing, issuance)  
**Rules:** PAY-01 → PAY-07, **SC-03**, **SC-04**  
**DB:** `billing_db` — tables: `billing_sheets`, `billing_sheet_items`, `billing_adjustments`

---

## Workflow Service (`workflow-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-07 Configurable workflow | 4.7 | `app/services/workflow_engine.py` (TODO) |

**Config:** `config/workflow_definitions.json`  
**Rules:** APR-01 → APR-07, **SC-05**, **SC-08**, **SC-09**  
**DB:** `workflow_db` — tables: `workflow_definitions`, `workflows`, `workflow_steps`

---

## E-Sign Service (`esign-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-08 Async e-sign | 4.8 | `app/api/v1/signing_sessions.py` (TODO) |

**Rules:** PAY-06, PAY-07, **SC-06**  
**DB:** `support_db.signing_sessions`

---

## Notification Service (`notification-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-09 Event-driven notifications | 4.9 | `app/consumers/` (TODO) |

**Rules:** APR-07, **SC-07**  
**DB:** `support_db.notifications`

---

## Audit Service (`audit-service`)

| Use case | Req | Start here |
|----------|-----|------------|
| UC-10 Audit + idempotency | 4.10 | `app/consumers/audit_consumer.py` (TODO) |

**Gateway:** idempotency check via Redis at `backend/gateway/`  
**DB:** `support_db.audit_logs`

---

## Frontend — page map

| Screen | Figma ref | File |
|--------|-----------|------|
| M01 Login | M01 | `frontend/src/pages/auth/LoginPage.tsx` |
| M02 Dashboard | M02 | `frontend/src/pages/dashboard/DashboardPage.tsx` |
| M03–M04 Customers & Contracts | M03–M04 | `frontend/src/pages/customers/`, `contracts/` |
| M05 Price lists | M05 | `frontend/src/pages/pricing/PriceListsPage.tsx` |
| M06 Volumes | M06 | `frontend/src/pages/operations/VolumesPage.tsx` |
| M07 Billing wizard | M07 | `frontend/src/pages/billing/BillingPage.tsx` |
| M08 Approval inbox | M08 | `frontend/src/pages/approvals/ApprovalsPage.tsx` |
| M09 Notifications | M09 | `frontend/src/pages/notifications/NotificationsPage.tsx` |
| M10 Audit log | M10 | `frontend/src/pages/audit/AuditPage.tsx` |
| M11 Admin | M11 | `frontend/src/pages/admin/AdminPage.tsx` |

**API client:** `frontend/src/api/client.ts`  
**Auth:** `frontend/src/context/AuthContext.tsx`

---

## Shared resources

| Resource | Path |
|----------|------|
| State machines | `config/state_machines.json` |
| Workflow templates | `config/workflow_definitions.json` |
| Seed / test data | `config/seed_data.json` |
| Shared Python lib | `backend/libs/udpt_common/` |

---

## Test scenarios (demo checklist)

| ID | Scenario | Primary owner |
|----|----------|---------------|
| SC-01 | Submit contract without attachment | contract-service |
| SC-02 | Overlapping price lists | pricing-service |
| SC-03 | Billing on expired contract | billing-service |
| SC-04 | Price snapshot immutable | billing-service |
| SC-05 | Concurrent approve | workflow-service |
| SC-06 | E-sign retry | esign-service |
| SC-07 | Notification failure retry | notification-service |
| SC-08 | Wrong assignee approve | workflow-service |
| SC-09 | Double submit | gateway + workflow-service |
| SC-10 | Appendix effective date | contract-service + billing-service |
