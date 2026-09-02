# Phân công công việc chi tiết — Logistics ABC

Tài liệu này mô tả **ai làm gì**, **folder nào**, **deliverable bảo vệ** cho nhóm 4 người.

> **Nguyên tắc:** Mỗi thành viên trình bày phần mình **owner**; phần shared review trước khi merge `main`.

---

## Tổng quan phân công

| Thành viên | MSSV | Email | Mức độ | Vai trò |
|------------|------|-------|--------|---------|
| **Nguyen The Hien** | 22127107 | *(owner)* | **Phụ trách chính — khối lượng lớn nhất** | Tech lead: Gateway, Contract, platform, FE core, tích hợp toàn hệ thống |
| **Bui Le Khoi** | 22127205 | blkhoi22@clc.fitus.edu.vn | **Phụ trách chính — khối lượng lớn** | Billing, Workflow, FE billing/approvals, cấu hình phê duyệt |
| **Le Quang Tan** | 22127378 | TanaLQ098@gmail.com | Phụ trách module | Pricing, Operation, FE pricing/ops |
| **Nguyen Minh Hieu** | 21127742 | hieu251103@gmail.com | **Phạm vi thu hẹp** | Notification, Audit, E-Sign (backend async) + 3 màn FE tương ứng |

**Ghi chú:** Hien và Khoi owner nhiều module backend + frontend core; Hieu tập trung 3 service hỗ trợ Kafka và 3 trang UI liên quan, không phụ trách toàn bộ frontend hay kiến trúc hệ thống.

---

## 1. Nguyen The Hien — Platform & Commercial Core *(phụ trách chính)*

### Backend — owner chính

| Module | Folder | UC / nhiệm vụ |
|--------|--------|----------------|
| **API Gateway** | `backend/gateway/` | JWT login, proxy `SERVICE_MAP`, RBAC, rate limit Redis, idempotency `X-Idempotency-Key`, audit GET method-aware |
| **Contract Service** | `backend/services/contract-service/` | UC-01 Khách hàng, UC-02 HĐ, UC-03 Phụ lục, CTR-01→07, MinIO attachment, `expiry_service` cảnh báo hết hạn |
| **Shared library (core)** | `backend/libs/udpt_common/` | `StateMachine`, `outbox`, `auth`, `kafka_events`, `audit_helper`, `config_loader`, `exceptions` |
| **Hạ tầng local** | `docker-compose.yml`, `Makefile`, `infra/` | Postgres init DB, Redis, Kafka, MinIO, K8s manifests |
| **Integration tests** | `backend/tests/` | Khung test; owner SC-01, SC-02, SC-07, SC-08, SC-10 |

### Frontend — owner chính (phần core)

| Màn / thành phần | Folder |
|------------------|--------|
| Auth, routing, RBAC | `context/AuthContext.tsx`, `routes/`, `config/rbac.ts` |
| Layout enterprise | `components/layout/AppLayout.tsx`, `CommandPalette.tsx` |
| Dashboard, Exceptions | `pages/dashboard/`, `pages/exceptions/`, `lib/exceptions.ts` |
| Customers, Contracts | `pages/customers/`, `pages/contracts/` |
| UI system | `components/ui/`, `styles/global.css` |
| Activity timeline | `components/ui/ActivityTimeline.tsx` |
| API client | `api/client.ts`, phần `customersApi`, `contractsApi` trong `modules.ts` |

### Config & docs — owner

| File | Nội dung |
|------|----------|
| `config/state_machines.json` | Contract, appendix — review chung team |
| `config/seed_data.json` | Khách hàng, HĐ demo, SC liên quan contract |
| `README.md`, `docs/ARCHITECTURE.md`, `docs/DEMO.md`, `docs/DEFENSE_GUIDE.md` | Tài liệu tổng & bảo vệ |

### Deliverable khi bảo vệ (Hien nói)

1. Luồng request qua Gateway → service + header `X-User-Id`
2. Submit HĐ: CTR-02, state machine, start workflow
3. Transactional outbox — tại sao không publish Kafka trực tiếp
4. Database-per-service — 6 DB, không join chéo
5. Demo: `sale01` → Exceptions → Contract → Activity timeline

---

## 2. Bui Le Khoi — Billing & Workflow *(phụ trách chính)*

### Backend — owner chính

| Module | Folder | UC / nhiệm vụ |
|--------|--------|----------------|
| **Workflow Service** | `backend/services/workflow-service/` | UC-07 engine, inbox, approve/reject/revision, APR-01 assignee user, optimistic lock SC-05, outbox relay loop |
| **Billing Service** | `backend/services/billing-service/` | UC-06 bảng kê, điều chỉnh, `snapshot_unit_price` SC-04, PAY-01→07, callback workflow & esign |
| **Shared (workflow)** | `udpt_common/assignee_map.py`, `document_callbacks.py` | Gán user duyệt, callback trạng thái document |

### Config — owner

| File | Nội dung |
|------|----------|
| `config/workflow_definitions.json` | Chuỗi 5 bước HĐ, billing, pricing, appendix |
| `config/state_machines.json` | `billing_sheet`, `billing_adjustment` — review với Hien |
| `config/seed_data.json` | Billing Aug demo, workflow instances |

### Integration tests — owner

SC-03, SC-04, SC-05, SC-06, SC-09 (`backend/tests/integration/test_scenarios.py`)

### Frontend — owner

| Màn | Folder |
|-----|--------|
| Billing list + detail + wizard | `pages/billing/` |
| Approvals inbox + SLA | `pages/approvals/` |
| E-sign list (tích hợp billing) | `pages/esign/` (flow billing → esign) |
| API | `workflowsApi`, `billingApi`, `esignApi` trong `modules.ts` |

### Deliverable khi bảo vệ (Khoi nói)

1. Workflow **config-driven** — không hard-code if/else theo loại tài liệu
2. APR-01: role + `current_assignee_user_id` — demo `sale02` → 403
3. Billing: chọn giá EFFECTIVE, snapshot sau approve SC-04
4. E-sign FAILED giữ APPROVED, retry PAY-07
5. Demo: `manager01`/`legal01` Approvals → `account01` billing → print

---

## 3. Le Quang Tan — Pricing & Operations

### Backend — owner chính

| Module | Folder | UC / nhiệm vụ |
|--------|--------|----------------|
| **Pricing Service** | `backend/services/pricing-service/` | UC-04 catalog, bảng giá, PRC-01→06, overlap SC-02, supersede |
| **Operation Service** | `backend/services/operation-service/` | UC-05 sản lượng, khóa kỳ VOL-01→04, PATCH volume trước LOCKED |

### Config — contributor

| File | Phần |
|------|------|
| `config/state_machines.json` | `price_list`, `volume_period` |
| `config/seed_data.json` | Price v1/v2, volumes Aug/Sep |

### Frontend — owner

| Màn | Folder |
|-----|--------|
| Price lists + compare | `pages/pricing/` |
| Volumes + period chips | `pages/operations/VolumesPage.tsx` |
| API | `pricingApi`, `operationsApi` trong `modules.ts` |

### Deliverable khi bảo vệ (Tan nói)

1. PRC-03 overlap → 409; PRC-05 supersede EFFECTIVE cũ
2. Kỳ OPEN → RECONCILED → LOCKED; sửa qty trước khóa
3. Demo: so sánh bảng giá v1/v2; ops khóa kỳ + tổng sản lượng

---

## 4. Nguyen Minh Hieu — Support Services *(phạm vi thu hẹp)*

> Phạm vi **thu hẹp**: 3 microservice hỗ trợ async + **3 màn FE tương ứng**. Không owner toàn bộ frontend.

### Backend — owner

| Module | Folder | UC / nhiệm vụ |
|--------|--------|----------------|
| **Notification Service** | `backend/services/notification-service/` | UC-09 Kafka consumer → `notifications`, API list/mark read |
| **Audit Service** | `backend/services/audit-service/` | UC-10 consumer → `audit_logs` bất biến, API query theo entity |
| **E-Sign Service** | `backend/services/esign-service/` | UC-08 phiên ký async, callback billing `complete-esign` |

### Frontend — owner (chỉ 3 module)

| Màn | Folder |
|-----|--------|
| Notifications | `pages/notifications/` |
| Audit (admin) | `pages/audit/AuditPage.tsx` |
| E-Sign | `pages/esign/EsignPage.tsx` (UI list/session; flow billing do Khoi) |
| i18n | Keys `notifications.*`, `audit.*`, `esign.*` trong `messages.ts` |

### Deliverable khi bảo vệ (Hieu nói)

1. Kafka consumer: Notification + Audit nhận event từ outbox relay
2. Audit immutable — GET scoped; admin page director only
3. E-sign async + callback billing
4. Demo: chuông notification; `director01` trang Audit

---

## 5. Công việc dùng chung (cả team)

| Hạng mục | Quy tắc |
|----------|---------|
| `config/state_machines.json` | PR phải có review Hien + owner entity |
| `config/seed_data.json` | Người thêm SC ghi rõ trong PR |
| `backend/libs/udpt_common/` | Sửa core cần approve Hien |
| Frontend i18n | Mọi key mới: **VI + EN** |
| Demo E2E | Trước merge: `make up` + flow sale01 → director01 |

---

## 6. Ma trận UC → Owner

| UC | Owner chính | Hỗ trợ |
|----|-------------|--------|
| UC-01 Customers | Hien | — |
| UC-02 Contracts | Hien | Khoi (workflow) |
| UC-03 Appendices | Hien | Khoi (workflow) |
| UC-04 Pricing | Tan | — |
| UC-05 Operations | Tan | — |
| UC-06 Billing | Khoi | Tan (volume), Hien (contract) |
| UC-07 Workflow | Khoi | Hien (gateway) |
| UC-08 E-Sign | Hieu | Khoi (billing) |
| UC-09 Notification | Hieu | Khoi (outbox emit) |
| UC-10 Audit | Hieu | Hien (audit_helper) |

---

## 7. Liên hệ & PR review

| Khu vực code | Reviewer mặc định |
|--------------|-------------------|
| Gateway, contract, udpt_common core, infra | **Hien** |
| Billing, workflow | **Khoi** |
| Pricing, operation | **Tan** |
| Notification, audit, esign | **Hieu** |
| `config/*.json` | Owner UC + **Hien** |

Chi tiết Git: [CONTRIBUTING.md](../CONTRIBUTING.md) · Bản đồ file: [SERVICE_MAP.md](./SERVICE_MAP.md)
