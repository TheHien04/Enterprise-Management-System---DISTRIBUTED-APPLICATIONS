# Contributing Guide

Hướng dẫn cho thành viên nhóm khi clone repo, chọn module, commit và mở Pull Request.

---

## 1. Onboarding nhanh (5 bước)

1. **Clone** repo và `cp .env.example .env`
2. **Đọc** [docs/SERVICE_MAP.md](./docs/SERVICE_MAP.md) — xác định folder module của bạn
3. **Chạy** `make up` — verify http://localhost:5173
4. **Cấu hình Git** (chỉ repo này) — dùng **email GitHub** của bạn:

   ```bash
   # Le Quang Tan
   git config user.name "Le Quang Tan"
   git config user.email "TanaLQ098@gmail.com"

   # Bui Le Khoi
   git config user.name "Bui Le Khoi"
   git config user.email "blkhoi22@clc.fitus.edu.vn"

   # Nguyen Minh Hieu
   git config user.name "Nguyen Minh Hieu"
   git config user.email "hieu251103@gmail.com"
   ```

5. **Tạo branch** `feature/<service>-<mo-ta>` và bắt đầu code

> **Repo owner (The Hien):** Mời collaborator tại [Settings → Collaborators](https://github.com/TheHien04/Enterprise-Management-System---DISTRIBUTED-APPLICATIONS/settings/access) — nhập email hoặc GitHub username của từng thành viên ở bảng dưới.

---

## 2. Phân công module (team Logistics ABC)

| Thành viên | MSSV | Email | Trách nhiệm chính | Folder |
|------------|------|-------|-------------------|--------|
| Nguyen The Hien | 22127107 | *(repo owner)* | Contract, Gateway, tích hợp | `backend/gateway/`, `backend/services/contract-service/` |
| Le Quang Tan | 22127378 | TanaLQ098@gmail.com | Pricing, Operation | `backend/services/pricing-service/`, `operation-service/` |
| Bui Le Khoi | 22127205 | blkhoi22@clc.fitus.edu.vn | Billing, Workflow | `backend/services/billing-service/`, `workflow-service/` |
| Nguyen Minh Hieu | 21127742 | hieu251103@gmail.com | Notification, Audit, E-Sign, Frontend | `notification-service/`, `audit-service/`, `esign-service/`, `frontend/` |

**Shared (cả team):**

| Resource | Path | Ai sửa |
|----------|------|--------|
| State machines | `config/state_machines.json` | Thống nhất team trước khi merge |
| Workflow definitions | `config/workflow_definitions.json` | Workflow owner (Khoi) |
| Seed data | `config/seed_data.json` | Người thêm scenario demo |
| Shared lib | `backend/libs/udpt_common/` | Review cẩn thận — ảnh hưởng mọi service |

---

## 3. Branch naming

```
feature/<service>-<short-description>
fix/<service>-<issue-or-scenario>
docs/<topic>
test/<scenario-id>
```

**Ví dụ:**

- `feature/pricing-overlap-validation`
- `fix/workflow-concurrent-approve-sc05`
- `feature/frontend-customer-edit-form`
- `docs/service-map-update`

**Không commit trực tiếp lên `main`** — luôn qua branch + PR.

---

## 4. Backend conventions

### Layout chuẩn (mọi microservice)

```
app/
├── api/v1/          # Route handlers — MỎNG, không business logic
├── core/            # config.py, deps.py
├── domain/          # state_registry.py, enums
├── models/          # SQLAlchemy ORM
├── schemas/         # Pydantic DTO
├── services/        # ★ Business logic + business rules
├── repositories/    # DB queries
├── consumers/       # Kafka (nếu có)
└── db/              # session, base
```

### Quy tắc bắt buộc

| Rule | Chi tiết |
|------|----------|
| Business logic | Chỉ trong `services/` — không trong `api/` |
| State transition | Dùng `udpt_common.StateMachine` + `config/state_machines.json` |
| Cross-service | REST qua gateway hoặc Kafka — **không** query DB service khác |
| Audit | Gọi `log_audit()` từ `udpt_common.audit_helper` khi thay đổi dữ liệu quan trọng |
| Config | Rules CTR/PRC/PAY/APR lấy từ đề — không hard-code magic strings rải rác |

### Thêm dependency shared lib

```bash
cd backend/services/<your-service>
pip install -e ../../libs/udpt_common
```

### Chạy service riêng lẻ

```bash
cd backend/services/contract-service
uvicorn app.main:app --reload --port 8001
```

Swagger: http://localhost:8001/docs

---

## 5. Frontend conventions

```
frontend/src/
├── api/modules.ts       # ★ Thêm API wrapper mới ở đây
├── config/rbac.ts       # Phân quyền menu/route — cập nhật khi thêm trang
├── pages/<module>/      # 1 folder = 1 module nghiệp vụ
├── components/ui/       # Component dùng chung
├── context/             # Auth, Theme, Locale
├── i18n/messages.ts     # Thêm key VI + EN khi thêm text UI
└── routes/AppRoutes.tsx # Đăng ký route mới + bọc RoleRoute
```

| Rule | Chi tiết |
|------|----------|
| Import | Dùng alias `@/` (vd. `@/api/modules`) |
| i18n | Mọi text hiển thị qua `useLocale()` → `t('key')` |
| API | Gọi qua Gateway `VITE_API_BASE_URL` (mặc định `:8080`) |
| RBAC | Thêm route vào `config/rbac.ts` **và** `NAV_SECTIONS` trong cùng file |

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

---

## 6. Commit messages

Format: `<type>(<scope>): <mô tả ngắn>`

| Type | Khi nào |
|------|---------|
| `feat` | Tính năng mới |
| `fix` | Sửa bug |
| `docs` | README, SERVICE_MAP, comment tài liệu |
| `test` | Thêm/sửa test |
| `refactor` | Tái cấu trúc, không đổi behavior |

**Ví dụ:**

```
feat(contract): enforce CTR-02 attachment check on submit
fix(billing): recalculate totals after adjustment SC-04
feat(frontend): add customer edit form with i18n
docs(readme): update team module assignment
test(integration): add SC-02 overlapping price list case
```

---

## 7. Trước khi mở Pull Request

- [ ] `make up` — stack chạy ổn, không crash loop
- [ ] Service của bạn: `GET /health` → OK
- [ ] API mới: Swagger cập nhật, test thủ công qua Gateway
- [ ] Frontend: hard refresh `Cmd+Shift+R`, test role liên quan
- [ ] Không commit `.env`, credentials, `node_modules/`, `__pycache__/`
- [ ] Nếu sửa `config/*.json` — ghi rõ trong PR description
- [ ] Chạy `pytest backend/tests -v` nếu sửa logic liên quan SC-xx

---

## 8. Code review — tiêu chí nhóm

1. **Đúng module** — code nằm đúng service/folder ownership
2. **Đúng đề** — business rules khớp CTR/PRC/PAY/APR trong đề bài
3. **Không phá demo** — `sale01` → submit HĐ → 5 bước duyệt vẫn chạy
4. **RBAC** — role không được phép thì cả UI lẫn API đều chặn
5. **i18n** — text mới có cả VI và EN

---

## 9. Liên hệ & tài liệu

| Cần gì | Xem |
|--------|-----|
| Tìm file code | [docs/SERVICE_MAP.md](./docs/SERVICE_MAP.md) |
| Kiến trúc tổng thể | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Chạy project | [README.md](./README.md) |
| Test scenarios | [config/seed_data.json](./config/seed_data.json) |
