# Logistics ABC — Enterprise Business Management System

[![Course](https://img.shields.io/badge/Course-UDPT-0ea5e9)](docs/UDPT.pdf)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Kafka-14b8a6)](docs/ARCHITECTURE.md)
[![Architecture](https://img.shields.io/badge/Architecture-8%20Microservices-64748b)](docs/SERVICE_MAP.md)
[![Tests](https://img.shields.io/badge/Tests-SC--01%E2%80%93SC--10-22c55e)](backend/tests/integration/test_scenarios.py)

Hệ thống **quản trị kinh doanh phân tán** cho **Logistics ABC Corporation** — môn **Ứng dụng phân tán (UDPT)**.

Monorepo gồm **8 microservices FastAPI**, **API Gateway**, **React/Vite frontend**, **PostgreSQL (database-per-service)**, **Redis**, **Kafka**, **MinIO** — chạy local bằng Docker Compose, có sẵn Kubernetes manifests.

**Report (báo cáo):** [`docs/UDPT-09-Report.pdf`](docs/UDPT-09-Report.pdf)  
**Repository:** [TheHien04/Enterprise-Management-System---DISTRIBUTED-APPLICATIONS](https://github.com/TheHien04/Enterprise-Management-System---DISTRIBUTED-APPLICATIONS)

---

## Mục lục

- [Tính năng](#tính-năng)
- [Kiến trúc](#kiến-trúc)
- [Giao diện & chức năng](#giao-diện--chức-năng)
- [Luồng nghiệp vụ (sequence)](#luồng-nghiệp-vụ-sequence)
- [Team & phân công](#team--phân-công)
- [Quick Start](#quick-start)
- [Tài khoản demo](#tài-khoản-demo)
- [Testing](#testing)
- [Tài liệu](#tài-liệu)

---

## Tính năng

| UC | Mô tả | Trạng thái |
|----|--------|------------|
| UC-01 | Quản lý khách hàng | ✅ |
| UC-02 | Vòng đời hợp đồng + phê duyệt 5 bước | ✅ |
| UC-03 | Phụ lục hợp đồng | ✅ |
| UC-04 | Bảng giá (overlap, supersede, version) | ✅ |
| UC-05 | Sản lượng & khóa kỳ | ✅ |
| UC-06 | Bảng kê thanh toán + snapshot giá | ✅ |
| UC-07 | Workflow engine JSON + assignee theo user | ✅ |
| UC-08 | Ký số điện tử (async + retry) | ✅ |
| UC-09 | Thông báo Kafka + cảnh báo hết hạn | ✅ |
| UC-10 | Audit log + outbox + idempotency + rate limit | ✅ |

**Điểm kỹ thuật nổi bật:** API Gateway (JWT/RBAC), transactional outbox → Kafka, state machine & workflow cấu hình JSON, RBAC 2 lớp (FE + Gateway), i18n VI/EN, dark mode.

---

## Kiến trúc

```
┌──────────────┐     HTTP      ┌─────────────┐
│   Frontend   │ ────────────► │ API Gateway │  :8080  JWT · RBAC · Idempotency
│  React/Vite  │               └──────┬──────┘
│    :5173     │                      │
└──────────────┘        ┌─────────────┼─────────────┐
                        ▼             ▼             ▼
                  Contract:8001  Workflow:8005  Billing:8004
                  Pricing:8002   Notify:8006    Operation:8003
                                 Audit:8007     E-Sign:8008
                        │             │             │
                        └────── PostgreSQL ─ Redis ─ Kafka ─ MinIO
                              (database-per-service)
```

| Service | Port | Database | Trách nhiệm |
|---------|------|----------|-------------|
| **API Gateway** | 8080 | — | JWT, routing, RBAC, rate limit, idempotency |
| **Contract** | 8001 | `contract_db` | Khách hàng, HĐ, phụ lục, attachment |
| **Pricing** | 8002 | `pricing_db` | Catalog, bảng giá |
| **Operation** | 8003 | `operation_db` | Sản lượng, khóa kỳ |
| **Billing** | 8004 | `billing_db` | Bảng kê, điều chỉnh, snapshot giá |
| **Workflow** | 8005 | `workflow_db` | Engine phê duyệt đa cấp |
| **Notification** | 8006 | `support_db` | Thông báo async (Kafka) |
| **Audit** | 8007 | `support_db` | Nhật ký bất biến (Kafka) |
| **E-Sign** | 8008 | `support_db` | Phiên ký số |

Database schema (database-per-service):

![Database schema overview](docs/screenshots/arch-overview.png)

Chi tiết: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/SERVICE_MAP.md](docs/SERVICE_MAP.md)

---

## Giao diện & chức năng

Ảnh UI lấy từ báo cáo đồ án (Figma / PortOps style). Client chỉ gọi **`http://localhost:8080`** (API Gateway).

### 1. Đăng nhập & RBAC — M01

Portal đăng nhập tập trung: JWT, demo accounts theo phòng ban (Sale, Manager, Legal, Ops, Accounting, Director, Admin). Password = username.

![Login](docs/screenshots/ui-01-login.png)

### 2. Dashboard (control tower) — M02

Tổng quan theo role: inbox chờ duyệt, exceptions, draft HĐ, cảnh báo hết hạn ≤ 30 ngày, quick links và luồng end-to-end.

![Dashboard](docs/screenshots/ui-02-dashboard.png)

### 3. Khách hàng — UC-01 / M03

Master data khách hàng: tạo mã KH, tìm kiếm, trạng thái ACTIVE/SUSPEND. Chỉ KH ACTIVE mới submit hợp đồng (CTR-02).

![Customers](docs/screenshots/ui-03-customers.png)

### 4. Hợp đồng — UC-02 / M04

Danh sách & chi tiết HĐ: pipeline trạng thái (DRAFT → UNDER_REVIEW → APPROVED → ACTIVE), attachment bắt buộc trước submit, timeline workflow + activity audit.

![Contracts](docs/screenshots/ui-04-contracts.png)

### 5. Bảng giá — UC-04 / M05

Catalog giá theo version/effective period; kiểm overlap (PRC-03 → 409), supersede version cũ, so sánh phiên bản.

![Price lists](docs/screenshots/ui-05-price-lists.png)

### 6. Sản lượng & khóa kỳ — UC-05 / M06

Nhập volume theo kỳ OPEN → RECONCILED → LOCKED. Sau khi khóa kỳ không sửa sản lượng (VOL-04) — dữ liệu đầu vào cho billing.

![Volumes](docs/screenshots/ui-06-volumes.png)

### 7. Bảng kê thanh toán — UC-06 / M07

Wizard Draft → Calculate → Reconcile → Submit: lấy volume + giá qua REST (không join DB), lưu **`snapshot_unit_price`** (SC-04), print/export statement, kích hoạt e-sign.

![Billing](docs/screenshots/ui-07-billing.png)

### 8. Inbox phê duyệt — UC-07 / M08

Approvals theo **role + assignee user** (APR-01): Approve / Reject / Request revision (comment bắt buộc). Filter All / Urgent / Mine, SLA chờ duyệt.

![Approvals](docs/screenshots/ui-08-approvals.png)

### 9. Thông báo — UC-09 / M09

Thông báo bất đồng bộ từ Outbox → Kafka → Notification Service; chuông topbar + danh sách / mark read.

![Notifications](docs/screenshots/ui-09-notifications.png)

### 10. Audit log — UC-10 / M10

Nhật ký bất biến (Director/Admin). Entity Activity timeline trên Contract/Billing cho role nghiệp vụ (GET scoped).

![Audit](docs/screenshots/ui-10-audit.png)

---

## Luồng nghiệp vụ (sequence)

| Use case | Diagram |
|----------|---------|
| UC-01 Customer management | ![UC-01](docs/screenshots/seq-01-customers.png) |
| UC-02 Contract lifecycle | ![UC-02](docs/screenshots/seq-02-contracts.png) |
| UC-04 Price list | ![UC-04](docs/screenshots/seq-03-pricing.png) |
| UC-05/06 Billing generation | ![Billing](docs/screenshots/seq-04-billing.png) |
| UC-08 Async e-sign | ![E-Sign](docs/screenshots/seq-05-esign.png) |
| UC-09/10 Notify & audit | ![Notify/Audit](docs/screenshots/seq-06-notify-audit.png) |

**Giao tiếp:** nghiệp vụ chính **đồng bộ REST**; thông báo/audit **bất đồng bộ Outbox → Kafka**.

---

## Team & phân công

Chi tiết: [docs/TEAM_ASSIGNMENT.md](docs/TEAM_ASSIGNMENT.md)

| Thành viên | MSSV | Trách nhiệm |
|------------|------|-------------|
| **Nguyen The Hien** | 22127107 | **Phụ trách chính** — Gateway, Contract, `udpt_common`, infra, FE core |
| **Bui Le Khoi** | 22127205 | **Phụ trách chính** — Billing, Workflow, FE billing/approvals |
| **Le Quang Tan** | 22127378 | Pricing, Operation, Notification, E-Sign + FE tương ứng |
| **Nguyen Minh Hieu** | 21127742 | *Phạm vi thu hẹp* — Audit service + trang Audit |

---

## Quick Start

### Yêu cầu

Docker Desktop · (tuỳ chọn) Node 20+ / Python 3.11+

### Chạy full stack

```bash
git clone https://github.com/TheHien04/Enterprise-Management-System---DISTRIBUTED-APPLICATIONS.git
cd Enterprise-Management-System---DISTRIBUTED-APPLICATIONS
cp .env.example .env
make up
```

Đợi ~30–60 giây cho Postgres/Kafka healthy.

| URL | Mô tả |
|-----|--------|
| http://localhost:5173 | **Frontend** |
| http://localhost:8080/docs | API Gateway Swagger |
| http://localhost:8001/docs | Contract Service Swagger |

Dừng: `make down` (giữ volume/data).

---

## Tài khoản demo

Password = **username**.

| User | Role | Menu chính |
|------|------|------------|
| `sale01` | SALES_STAFF | KH, HĐ, Bảng giá, Approvals |
| `sale02` | SALES_STAFF | Demo APR-01 (không phải assignee) |
| `manager01` | SALES_MANAGER | Duyệt Manager |
| `legal01` | LEGAL | HĐ, Approvals |
| `ops01` | OPERATIONS | Volumes |
| `account01` | ACCOUNTING | Billing, E-sign, Approvals |
| `director01` | DIRECTOR | Oversight + Audit |
| `admin01` | ADMIN | Full + Admin |

RBAC: sidebar + route guard (FE) + gateway API (BE).

---

## Testing

```bash
make up
pip install -e ".[test]"
pytest backend/tests -v
```

Integration scenarios **SC-01 → SC-10** trong `backend/tests/integration/test_scenarios.py` (seed: `config/seed_data.json`).

---

## Tài liệu

| Tài liệu | Nội dung |
|----------|----------|
| [docs/UDPT-09-Report.pdf](docs/UDPT-09-Report.pdf) | **Báo cáo đồ án** |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Thiết kế hệ thống |
| [docs/SERVICE_MAP.md](docs/SERVICE_MAP.md) | UC → folder → API |
| [docs/TEAM_ASSIGNMENT.md](docs/TEAM_ASSIGNMENT.md) | Phân công nhóm |
| [docs/QTKD_DATH.pdf](docs/QTKD_DATH.pdf) | Đề bài |
| [docs/UDPT.pdf](docs/UDPT.pdf) | Tài liệu môn |
| [docs/Data sample.pdf](docs/Data%20sample.pdf) | Dữ liệu mẫu |
| [config/state_machines.json](config/state_machines.json) | State machines |
| [config/workflow_definitions.json](config/workflow_definitions.json) | Workflow templates |

---

## Demo flow gợi ý

1. `sale01` → Dashboard / Exceptions → Contract → Submit  
2. `manager01` / `legal01` → Approvals  
3. `ops01` → Volumes; `account01` → Billing  
4. `director01` → Audit  
5. Toggle Dark mode + VI/EN  

---

<p align="center">
  <sub>Logistics ABC Corporation · Ứng dụng phân tán (UDPT) · 2026</sub>
</p>
