# Enterprise Management System — Logistics ABC

[![Course](https://img.shields.io/badge/Course-UDPT-blue)](docs/QTKD_DATH.pdf)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Kafka-0ea5e9)](docs/ARCHITECTURE.md)
[![Tests](https://img.shields.io/badge/Tests-SC--01%E2%80%93SC--10-success)](backend/tests/integration/test_scenarios.py)
[![License](https://img.shields.io/badge/License-Academic-lightgrey)](#)

Hệ thống quản trị kinh doanh phân tán cho **Logistics ABC Corporation** — môn **Ứng dụng phân tán (UDPT)**.

Monorepo gồm **8 microservices FastAPI**, **API Gateway**, **React/Vite frontend**, **PostgreSQL**, **Redis**, **Kafka**, **MinIO** — triển khai local bằng Docker Compose, sẵn sàng mở rộng lên Kubernetes.

> **Mới vào repo?** Đọc [docs/SERVICE_MAP.md](./docs/SERVICE_MAP.md) → tìm đúng folder module của bạn trong 30 giây.

**Repository:** [TheHien04/Enterprise-Management-System---DISTRIBUTED-APPLICATIONS](https://github.com/TheHien04/Enterprise-Management-System---DISTRIBUTED-APPLICATIONS)

---

## Mục lục

- [Tính năng](#tính-năng)
- [Kiến trúc](#kiến-trúc)
- [Team & phân công module](#team--phân-công-module)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Quick Start](#quick-start)
- [Tài khoản demo & phân quyền](#tài-khoản-demo--phân-quyền)
- [Quy trình làm việc (Git)](#quy-trình-làm-việc-git)
- [Testing](#testing)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tính năng

| UC | Mô tả | Trạng thái |
|----|--------|------------|
| UC-01 | Quản lý khách hàng | ✅ |
| UC-02 | Vòng đời hợp đồng + phê duyệt 5 bước | ✅ |
| UC-03 | Phụ lục hợp đồng | ✅ |
| UC-04 | Bảng giá (overlap + supersede + edit Rejected) | ✅ |
| UC-05 | Sản lượng & khóa kỳ (+ chỉnh trước khóa) | ✅ |
| UC-06 | Bảng kê thanh toán + điều chỉnh + snapshot giá | ✅ |
| UC-07 | Workflow engine JSON + assignee theo user (APR-01) | ✅ |
| UC-08 | Ký số điện tử (async callback + retry) | ✅ |
| UC-09 | Thông báo Kafka + cảnh báo hết hạn | ✅ |
| UC-10 | Audit log + outbox + idempotency + rate limit | ✅ |

Frontend: UI enterprise (light/dark), i18n VI/EN, **RBAC theo 6 phòng ban**, wizard billing, so sánh bảng giá, dashboard expiry, approvals với comment bắt buộc.

---

## Kiến trúc

```
┌──────────────┐     HTTP      ┌─────────────┐
│   Frontend   │ ────────────► │ API Gateway │  :8080  JWT + RBAC + Idempotency
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
| **API Gateway** | 8080 | — | JWT, routing, RBAC, idempotency (Redis) |
| **Contract** | 8001 | `contract_db` | Khách hàng, HĐ, phụ lục, attachment (MinIO) |
| **Pricing** | 8002 | `pricing_db` | Catalog dịch vụ, bảng giá |
| **Operation** | 8003 | `operation_db` | Sản lượng, khóa kỳ |
| **Billing** | 8004 | `billing_db` | Bảng kê, điều chỉnh, snapshot giá |
| **Workflow** | 8005 | `workflow_db` | Engine phê duyệt đa cấp |
| **Notification** | 8006 | `support_db` | Thông báo async (Kafka) |
| **Audit** | 8007 | `support_db` | Nhật ký bất biến (Kafka) |
| **E-Sign** | 8008 | `support_db` | Phiên ký số |

Chi tiết thiết kế: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Team & phân công module

Chi tiết deliverable, ma trận UC → owner: **[docs/TEAM_ASSIGNMENT.md](./docs/TEAM_ASSIGNMENT.md)**

| Thành viên | MSSV | Email | Trách nhiệm | Folder chính |
|------------|------|-------|-------------|--------------|
| **Nguyen The Hien** | 22127107 | *(owner)* | **Phụ trách chính** — Gateway, Contract, `udpt_common`, infra, FE core, tích hợp | `backend/gateway/`, `contract-service/`, `libs/udpt_common/`, FE layout/auth/dashboard/contracts/customers/exceptions |
| **Bui Le Khoi** | 22127205 | blkhoi22@clc.fitus.edu.vn | **Phụ trách chính** — Billing, Workflow, FE billing/approvals, workflow config | `billing-service/`, `workflow-service/`, `pages/billing/`, `pages/approvals/` |
| **Le Quang Tan** | 22127378 | TanaLQ098@gmail.com | Pricing, Operation, **Notification, E-Sign**, FE tương ứng | `pricing-service/`, `operation-service/`, `notification-service/`, `esign-service/`, `pages/pricing/`, `operations/`, `notifications/`, `esign/` |
| **Nguyen Minh Hieu** | 21127742 | hieu251103@gmail.com | *Phạm vi thu hẹp nhất* — **Audit** | `audit-service/`, `pages/audit/` |

> Script demo bảo vệ: [docs/DEMO.md](./docs/DEMO.md) · Q&A vấn đáp: [docs/DEFENSE_GUIDE.md](./docs/DEFENSE_GUIDE.md) · Luồng xử lý: [docs/REQUEST_FLOWS.md](./docs/REQUEST_FLOWS.md)

**Quy tắc vàng:** Mỗi service **chỉ ghi DB của mình**. Giao tiếp cross-service qua **REST** (gateway) hoặc **Kafka events** — không join DB chéo.

---

## Cấu trúc thư mục

```
Project UDPT/
│
├── backend/
│   ├── gateway/                    # API Gateway — JWT, proxy, RBAC, admin
│   │   └── app/
│   │       ├── api/                # auth.py, admin.py
│   │       ├── core/               # config, deps
│   │       └── main.py             # SERVICE_MAP + route proxy
│   │
│   ├── libs/
│   │   └── udpt_common/            # ★ Thư viện dùng chung (CÀI TRƯỚC KHI CODE)
│   │       └── udpt_common/        # StateMachine, auth, kafka, audit, storage…
│   │
│   ├── services/                   # ★ 8 microservices — MỖI SERVICE 1 FOLDER
│   │   ├── contract-service/       # UC-01, 02, 03  → port 8001
│   │   ├── pricing-service/        # UC-04           → port 8002
│   │   ├── operation-service/      # UC-05           → port 8003
│   │   ├── billing-service/        # UC-06           → port 8004
│   │   ├── workflow-service/       # UC-07           → port 8005
│   │   ├── notification-service/   # UC-09           → port 8006
│   │   ├── audit-service/          # UC-10           → port 8007
│   │   └── esign-service/          # UC-08           → port 8008
│   │
│   └── tests/                      # Integration tests SC-01 → SC-10
│       ├── conftest.py
│       └── integration/
│
├── frontend/                       # React + Vite + TypeScript
│   └── src/
│       ├── api/modules.ts          # ★ Gọi API qua Gateway
│       ├── config/rbac.ts          # Phân quyền menu + route
│       ├── pages/                  # ★ 1 folder = 1 module UI
│       │   ├── auth/               # Login
│       │   ├── customers/          # UC-01
│       │   ├── contracts/          # UC-02, 03 (Appendices)
│       │   ├── pricing/            # UC-04
│       │   ├── operations/         # UC-05
│       │   ├── billing/            # UC-06
│       │   ├── approvals/          # UC-07 inbox
│       │   ├── esign/              # UC-08
│       │   ├── notifications/      # UC-09
│       │   ├── audit/              # UC-10
│       │   └── admin/
│       ├── components/             # UI tái sử dụng (DataTable, StatusBadge…)
│       ├── context/                # Auth, Theme, Locale, Toast
│       ├── i18n/                   # messages.ts (VI/EN)
│       └── routes/                 # AppRoutes + RoleRoute guard
│
├── config/                         # ★ Cấu hình nghiệp vụ (KHÔNG hard-code)
│   ├── state_machines.json         # Trạng thái HĐ, billing, pricing…
│   ├── workflow_definitions.json   # Chuỗi phê duyệt theo document_type
│   └── seed_data.json              # Dữ liệu demo + test scenarios
│
├── docs/                           # Tài liệu thiết kế
│   ├── SERVICE_MAP.md              # ★ Bản đồ module — ĐỌC ĐẦU TIÊN
│   ├── ARCHITECTURE.md
│   └── QTKD_DATH.pdf               # Đề bài gốc
│
├── infra/
│   ├── postgres/init-databases.sql # Tạo 6 database khi boot
│   └── k8s/                        # Kubernetes manifests (Minikube)
│
├── docker-compose.yml              # Chạy full stack local
├── Makefile                        # make up | down | logs | ps
├── pyproject.toml                  # pytest config
├── CONTRIBUTING.md                 # Quy ước branch, commit, PR
└── .env.example                    # Copy → .env trước khi chạy
```

### Cấu trúc bên trong mỗi microservice

Mọi service backend **dùng cùng một layout** — học một lần, áp dụng cho cả 8 service:

```
backend/services/<tên-service>/app/
├── api/v1/           # Route HTTP (mỏng — chỉ gọi service)
├── core/             # config.py, deps.py (DB session)
├── domain/           # State machine registry, enums
├── models/           # SQLAlchemy entities
├── schemas/          # Pydantic request/response DTO
├── services/         # ★ Business logic — CODE CHÍNH Ở ĐÂY
├── repositories/     # Truy vấn DB
├── consumers/        # (nếu có) Kafka consumer
└── db/               # session.py, base.py
```

---

## Quick Start

### Yêu cầu

| Tool | Phiên bản |
|------|-----------|
| Docker & Docker Compose | latest |
| Node.js (dev frontend local) | 20+ |
| Python (dev backend local) | 3.11+ |

### 1. Clone & cấu hình

```bash
git clone https://github.com/TheHien04/Enterprise-Management-System---DISTRIBUTED-APPLICATIONS.git
cd Enterprise-Management-System---DISTRIBUTED-APPLICATIONS
cp .env.example .env
```

### 2. Chạy full stack

```bash
make up
# hoặc: docker compose up -d --build
```

Đợi ~30–60 giây cho Postgres, Kafka healthy.

### 3. Truy cập

| URL | Mô tả |
|-----|--------|
| http://localhost:5173 | **Frontend** (dùng URL này, không dùng bare `localhost`) |
| http://localhost:8080/docs | API Gateway Swagger |
| http://localhost:8001/docs | Contract Service Swagger |
| http://localhost:9001 | MinIO Console |

### 4. Dev local từng phần (tùy chọn)

```bash
# Backend một service
cd backend/services/contract-service
pip install -r requirements.txt
pip install -e ../../libs/udpt_common
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm install
npm run dev
```

---

## Tài khoản demo & phân quyền

Password = username cho tất cả account.

| User | Vai trò | Phòng ban | Menu chính |
|------|---------|-----------|------------|
| `sale01` | SALES_STAFF | Kinh doanh | KH, HĐ, Bảng giá, Phê duyệt |
| `sale02` | SALES_STAFF | Kinh doanh | Cùng role — dùng demo APR-01 (không phải assignee) |
| `manager01` | SALES_MANAGER | Kinh doanh | Giống sale01 |
| `legal01` | LEGAL | Pháp chế | HĐ, Phụ lục, Phê duyệt |
| `ops01` | OPERATIONS | Khai thác | Khối lượng |
| `account01` | ACCOUNTING | Kế toán | Billing, Ký số, Phê duyệt |
| `director01` | DIRECTOR | Ban GĐ | Oversight + Audit |
| `admin01` | ADMIN | Quản trị | Full quyền |

RBAC: sidebar + route guard (frontend) + gateway API (backend). Gõ URL sai quyền → trang 403.

---

## Quy trình làm việc (Git)

### Thành viên mới — setup Git identity (chỉ trong repo này)

Dùng tên và email GitHub tương ứng:

| Thành viên | Lệnh setup |
|------------|------------|
| Le Quang Tan | `git config user.name "Le Quang Tan"` · `git config user.email "TanaLQ098@gmail.com"` |
| Bui Le Khoi | `git config user.name "Bui Le Khoi"` · `git config user.email "blkhoi22@clc.fitus.edu.vn"` |
| Nguyen Minh Hieu | `git config user.name "Nguyen Minh Hieu"` · `git config user.email "hieu251103@gmail.com"` |

Sau khi owner mời collaborator, thành viên **Accept invitation** trong email/GitHub notifications rồi `git clone` repo.

### Branch & commit

```bash
# Tạo branch theo module của bạn
git checkout -b feature/pricing-overlap-validation

# Commit theo convention
git commit -m "feat(pricing): add PRC-03 overlap check for SC-02"
```

Quy ước chi tiết: [CONTRIBUTING.md](./CONTRIBUTING.md)

| Loại | Format ví dụ |
|------|----------------|
| Branch | `feature/<service>-<mô-tả-ngắn>` |
| Commit | `feat(billing): …` / `fix(workflow): …` / `docs(readme): …` |

### Pull Request checklist

- [ ] Service chạy được (`make up` hoặc uvicorn riêng)
- [ ] `/health` trả OK
- [ ] Không commit `.env` / secrets
- [ ] Cập nhật Swagger nếu đổi API
- [ ] Chạy test liên quan (nếu có)

---

## Testing

```bash
# Cần stack đang chạy (make up)
pip install -e ".[test]"
pytest backend/tests -v
```

| Scenario | Mô tả |
|----------|--------|
| SC-01 → SC-10 | Xem `config/seed_data.json` → `test_scenarios` |
| File test | `backend/tests/integration/test_scenarios.py` |

---

## Tài liệu tham khảo

| Tài liệu | Nội dung |
|----------|----------|
| [docs/TEAM_ASSIGNMENT.md](./docs/TEAM_ASSIGNMENT.md) | **Phân công chi tiết** — ai làm gì, deliverable bảo vệ |
| [docs/DEMO.md](./docs/DEMO.md) | Script demo 3 phút + xử lý sự cố |
| [docs/DEFENSE_GUIDE.md](./docs/DEFENSE_GUIDE.md) | Câu hỏi vấn đáp thường gặp |
| [docs/REQUEST_FLOWS.md](./docs/REQUEST_FLOWS.md) | Sequence diagram luồng xử lý |
| [docs/SERVICE_MAP.md](./docs/SERVICE_MAP.md) | Bản đồ UC → folder → API |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Thiết kế hệ thống |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Quy ước code & Git |
| [infra/k8s/README.md](./infra/k8s/README.md) | Deploy Kubernetes |
| [config/state_machines.json](./config/state_machines.json) | State machine |
| [docs/GAPS_AND_ROADMAP.md](./docs/GAPS_AND_ROADMAP.md) | Phạm vi đủ/thiếu & checklist nộp báo cáo |

---

## Demo flow gợi ý (trình bày)

Xem script đầy đủ theo từng thành viên: **[docs/DEMO.md](./docs/DEMO.md)**

1. **Hien** — `sale01` → Dashboard/Exceptions → Contract → Activity timeline  
2. **Khoi** — `manager01`/`legal01` Approvals → `account01` Billing print  
3. **Tan** — `ops01` Volumes; notification/esign; (tuỳ chọn) Pricing compare  
4. **Hieu** — `director01` Audit  
5. Toggle Dark mode + VI/EN trên topbar  

---

<p align="center">
  <sub>Logistics ABC Corporation · UDPT Course · 2026</sub>
</p>
