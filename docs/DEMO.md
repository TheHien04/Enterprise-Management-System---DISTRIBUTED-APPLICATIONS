# Demo & bảo vệ — Script 3 phút

Script chuẩn cho buổi trình bày / vấn đáp. Chạy stack trước: `make up` → đợi ~60s → http://localhost:5173

Password mọi account = **username**.

---

## Chuẩn bị trước khi vào phòng

```bash
cp .env.example .env   # nếu chưa có
make up
# Kiểm tra
curl -s http://localhost:8080/health
curl -s http://localhost:5173 | head -1
```

Hard refresh trình duyệt: **Cmd+Shift+R**.

---

## Script theo thời gian

| Thời gian | Người demo | Thao tác | Nói (gợi ý) |
|-----------|------------|----------|-------------|
| 0:00 | **Hien** | Mở `:5173`, login `sale01` | "Client chỉ gọi API Gateway :8080; JWT + RBAC hai lớp FE và gateway." |
| 0:20 | Hien | Dashboard → KPI strip → nav **Exceptions** | "Control tower: tổng hợp duyệt trễ, HĐ sắp hết hạn, e-sign/billing FAILED." |
| 0:40 | Hien | **⌘K** hoặc `?` → Contracts → mở HĐ ACTIVE | "Command palette; lifecycle ribbon DRAFT→ACTIVE." |
| 1:00 | Hien | Expand **Entity activity** trên contract | "Audit immutable qua audit-service; sale đọc GET scoped theo entity." |
| 1:15 | **Khoi** | Logout → `manager01` → **Approvals** → filter **Urgent** | "Workflow JSON 5 bước; SLA >24h highlight." |
| 1:35 | Khoi | Approve 1 item (comment nếu cần) | "Optimistic lock version; outbox → Kafka → notification." |
| 1:50 | Khoi | Logout → `account01` → **Billing** → mở sheet → **Print/CSV** | "snapshot_unit_price SC-04; billing service DB riêng." |
| 2:10 | **Tan** | `ops01` → **Operations**; chuông **Notifications**; **E-sign** | "Pricing/ops + Kafka notification + esign callback." |
| 2:35 | **Hieu** | `director01` → **Audit** | "Audit immutable; admin query director only." |
| 2:55 | Hien | Toggle **Dark** + **VI/EN** topbar | "i18n 500+ keys; portal enterprise logistics." |

---

## Demo phụ (nếu thầy hỏi sâu)

### SC-01 — Submit không attachment
- HĐ DRAFT chưa add attachment → Submit → **422** CTR-02

### SC-08 — Sai người duyệt
- Login `sale02` → Approvals → approve item của `sale01` → **403** APR-01

### SC-05 — Approve đồng thời
- Hai tab cùng approve một workflow với version cũ → tab thứ hai **409**

### SC-06 — E-sign fail
- Billing APPROVED → esign FAILED → vẫn APPROVED → retry send-esign

---

## Tài khoản & menu

| User | Role | Menu chính | Người trình bày |
|------|------|------------|-----------------|
| sale01 | SALES_STAFF | KH, HĐ, Pricing, Approvals | Hien |
| manager01 | SALES_MANAGER | Approvals | Khoi |
| legal01 | LEGAL | HĐ, Approvals | Khoi |
| ops01 | OPERATIONS | Volumes, Notifications, E-sign | Tan |
| account01 | ACCOUNTING | Billing, Approvals | Khoi |
| director01 | DIRECTOR | Audit, oversight | Hieu |
| admin01 | ADMIN | Full + Admin | Hien |

---

## URL tham khảo

| URL | Mục đích |
|-----|----------|
| http://localhost:5173 | Frontend |
| http://localhost:8080/docs | Gateway Swagger |
| http://localhost:8001/docs | Contract Swagger |
| http://localhost:8005/docs | Workflow Swagger |

---

## Xử lý sự cố nhanh

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Approvals/Notifications Not Found | `docker compose restart api-gateway` |
| Cannot reach API | `make up`, kiểm tra `:8080` |
| Trang trắng FE | Hard refresh; `docker compose logs frontend` |
| Test integration | `pytest backend/tests/integration/test_scenarios.py -v` |

---

## Tài liệu liên quan

- [DEFENSE_GUIDE.md](./DEFENSE_GUIDE.md) — câu hỏi vấn đáp
- [REQUEST_FLOWS.md](./REQUEST_FLOWS.md) — sequence diagram
- [TEAM_ASSIGNMENT.md](./TEAM_ASSIGNMENT.md) — ai demo phần nào
