# Service Map — Bản đồ module cho team

File này giúp mỗi thành viên **tìm đúng folder trong 30 giây**.

Mỗi dòng liên kết: **Use case → Service → Folder → Gateway route → Port**.

---

## Quick index

| Nếu bạn làm… | Folder | Gateway route | Port |
|--------------|--------|---------------|------|
| Khách hàng, HĐ, phụ lục | `backend/services/contract-service/` | `/api/v1/customers`, `/api/v1/contracts` | 8001 |
| Catalog, bảng giá | `backend/services/pricing-service/` | `/api/v1/pricing/*` | 8002 |
| Sản lượng, khóa kỳ | `backend/services/operation-service/` | `/api/v1/operations/*` | 8003 |
| Bảng kê, điều chỉnh | `backend/services/billing-service/` | `/api/v1/billing/*` | 8004 |
| Engine phê duyệt | `backend/services/workflow-service/` | `/api/v1/workflows/*` | 8005 |
| Thông báo | `backend/services/notification-service/` | `/api/v1/notifications/*` | 8006 |
| Audit log | `backend/services/audit-service/` | `/api/v1/audit/*` | 8007 |
| Ký số | `backend/services/esign-service/` | `/api/v1/esign/*` | 8008 |
| Login, JWT, proxy | `backend/gateway/` | `/api/v1/auth/login` | 8080 |
| Web UI | `frontend/src/pages/` | — | 5173 |

---

## Layer convention (mọi microservice)

```
app/
├── api/v1/           ← HTTP routes (mỏng — delegate sang services)
├── core/             ← config, dependencies
├── domain/           ← enums, state registry
├── models/           ← SQLAlchemy ORM
├── schemas/          ← Pydantic DTO
├── services/         ← ★ Business logic
├── repositories/     ← DB queries
├── consumers/        ← Kafka (nếu có)
└── db/               ← session, base
```

**Rule:** Routes không chứa business rules. Dùng `udpt_common.StateMachine` + `config/state_machines.json`.

---

## Contract Service — UC-01, 02, 03

| UC | Req | Entry point |
|----|-----|-------------|
| UC-01 Customers | 4.1 | `app/api/v1/customers.py` → `services/customer_service.py` |
| UC-02 Contracts | 4.2 | `app/api/v1/contracts.py` → `services/customer_service.py` |
| UC-03 Appendices | 4.3 | `app/api/v1/contracts.py` (appendices routes) |

| | |
|--|--|
| **State machine** | `config/state_machines.json` → `contract`, `appendix` |
| **Rules** | CTR-01 → CTR-07 |
| **DB** | `contract_db` — `customers`, `contracts`, `contract_appendices`, `contract_attachments` |
| **Seed** | `app/services/seed.py` |
| **Internal API** | `app/api/v1/internal.py` (workflow callback, appendices for billing) |

---

## Pricing Service — UC-04

| UC | Req | Entry point |
|----|-----|-------------|
| UC-04 Price lists | 4.4 | `app/api/v1/price_lists.py` → `services/price_list_service.py` |
| Catalog | — | `app/api/v1/catalog.py` → `services/catalog_service.py` |

| | |
|--|--|
| **State machine** | `price_list` |
| **Rules** | PRC-01 → PRC-06, **SC-02** |
| **DB** | `pricing_db` — `services`, `price_lists`, `price_list_items` |
| **Internal** | `app/api/v1/internal.py` (workflow callback) |

---

## Operation Service — UC-05

| UC | Req | Entry point |
|----|-----|-------------|
| UC-05 Volumes & periods | 4.5 | `app/api/v1/operations.py` → `services/operation_service.py` |

| | |
|--|--|
| **State machine** | `volume_period` |
| **Rules** | VOL-01 → VOL-04 |
| **DB** | `operation_db` — `billing_periods`, `volume_records` |
| **Seed** | `seed_operation_data()` trong `operation_service.py` |

---

## Billing Service — UC-06

| UC | Req | Entry point |
|----|-----|-------------|
| UC-06 Billing sheets | 4.6 | `app/api/v1/billing_sheets.py` → `services/billing_service.py` |
| Adjustments | 4.6 | `/{sheet_id}/adjustments` |
| Workflow callback | — | `app/api/v1/internal.py` |

| | |
|--|--|
| **State machine** | `billing_sheet` (approval, signing, issuance) |
| **Rules** | PAY-01 → PAY-07, **SC-03**, **SC-04**, **SC-10** |
| **DB** | `billing_db` — `billing_sheets`, `billing_sheet_items`, `billing_adjustments` |

---

## Workflow Service — UC-07

| UC | Req | Entry point |
|----|-----|-------------|
| UC-07 Workflow engine | 4.7 | `app/api/v1/workflows.py` → `services/workflow_engine.py` |

| | |
|--|--|
| **Config** | `config/workflow_definitions.json` |
| **Rules** | APR-01 → APR-07, **SC-05**, **SC-08**, **SC-09** |
| **DB** | `workflow_db` — `workflows`, `workflow_steps`, `workflow_logs` |

---

## E-Sign Service — UC-08

| UC | Req | Entry point |
|----|-----|-------------|
| UC-08 Signing sessions | 4.8 | `app/api/v1/signing_sessions.py` → `services/signing_service.py` |

| | |
|--|--|
| **Rules** | PAY-06, PAY-07, **SC-06** |
| **DB** | `support_db.signing_sessions` |
| **Callback** | Gọi billing `complete-esign` khi xong |

---

## Notification Service — UC-09

| UC | Req | Entry point |
|----|-----|-------------|
| UC-09 Notifications | 4.9 | `app/api/v1/notifications.py` + `consumers/notification_consumer.py` |

| | |
|--|--|
| **Rules** | APR-07, **SC-07** |
| **DB** | `support_db.notifications` |
| **Events** | Kafka topic `udpt.domain.events` |

---

## Audit Service — UC-10

| UC | Req | Entry point |
|----|-----|-------------|
| UC-10 Audit trail | 4.10 | `app/api/v1/audit.py` + `consumers/audit_consumer.py` |

| | |
|--|--|
| **Gateway** | Idempotency Redis tại `backend/gateway/app/main.py` |
| **Helper** | `backend/libs/udpt_common/udpt_common/audit_helper.py` |
| **DB** | `support_db.audit_logs` |

---

## Gateway

| Chức năng | File |
|-----------|------|
| Login / JWT | `app/api/auth.py` |
| Admin users | `app/api/admin.py` |
| Proxy + RBAC | `app/main.py` → `SERVICE_ROLE_REQUIREMENTS` |
| Idempotency | Redis cache trong `main.py` |

---

## Frontend — page map

| Màn hình | Route | File |
|----------|-------|------|
| Login | `/login` | `pages/auth/LoginPage.tsx` |
| Dashboard | `/dashboard` | `pages/dashboard/DashboardPage.tsx` |
| Customers | `/customers` | `pages/customers/` |
| Contracts | `/contracts`, `/contracts/:id` | `pages/contracts/` |
| Appendices | `/appendices`, `/appendices/:id` | `pages/contracts/AppendicesPage.tsx` |
| Price lists | `/pricing`, `/pricing/:id` | `pages/pricing/` |
| Volumes | `/operations` | `pages/operations/VolumesPage.tsx` |
| Billing | `/billing`, `/billing/:id` | `pages/billing/` |
| E-Sign | `/esign` | `pages/esign/EsignPage.tsx` |
| Approvals | `/approvals` | `pages/approvals/ApprovalsPage.tsx` |
| Notifications | `/notifications` | `pages/notifications/` |
| Audit | `/audit` | `pages/audit/AuditPage.tsx` |
| Admin | `/admin` | `pages/admin/AdminPage.tsx` |
| 403 Forbidden | `/forbidden` | `pages/errors/ForbiddenPage.tsx` |

| Shared | Path |
|--------|------|
| API client | `src/api/modules.ts` |
| RBAC config | `src/config/rbac.ts` |
| Auth | `src/context/AuthContext.tsx` |
| i18n | `src/i18n/messages.ts` |
| UI components | `src/components/ui/` |

---

## Shared resources (cả team)

| Resource | Path |
|----------|------|
| State machines | `config/state_machines.json` |
| Workflow templates | `config/workflow_definitions.json` |
| Seed + test scenarios | `config/seed_data.json` |
| Shared Python lib | `backend/libs/udpt_common/` |

---

## Test scenarios (demo checklist)

| ID | Scenario | Owner service |
|----|----------|---------------|
| SC-01 | Submit HĐ không attachment → 422 | contract |
| SC-02 | Bảng giá chồng lấn → 409 | pricing |
| SC-03 | Billing HĐ hết hạn → 422 | billing |
| SC-04 | snapshot_unit_price không đổi | billing |
| SC-05 | Approve đồng thời → 409 | workflow |
| SC-06 | E-sign FAILED → retry | esign + billing |
| SC-07 | Notification health | notification |
| SC-08 | Sai người duyệt → 403 | workflow |
| SC-09 | Idempotency key | gateway + workflow |
| SC-10 | Phụ lục Oct/2026, bill Sep → giá cũ | contract + billing |

**Chạy test:** `pytest backend/tests/integration/test_scenarios.py -v` (cần `make up`)
