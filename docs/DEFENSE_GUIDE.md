# Hướng dẫn vấn đáp — Câu hỏi thường gặp

Tài liệu ngắn gọn để trả lời hội đồng. Chi tiết luồng: [REQUEST_FLOWS.md](./REQUEST_FLOWS.md).

---

## Mở đầu 30 giây

> Hệ thống quản trị kinh doanh logistics theo **microservices** (8 service + gateway), **database-per-service**, **workflow & state machine cấu hình JSON**, side effect qua **Transactional Outbox → Kafka**. Frontend React mirror RBAC, demo **10 scenario SC-01→SC-10**.

---

## Kiến trúc

**Q: Tại sao microservices?**  
Scale/deploy từng domain; team 4 người chia module; đúng yêu cầu môn phân tán. Trade-off: phức tạp hơn monolith (gateway, Kafka).

**Q: Service giao tiếp thế nào?**  
- **Đồng bộ:** REST (billing gọi contract/pricing; workflow callback `internal.py`)  
- **Bất đồng bộ:** Outbox → Kafka → Notification, Audit  
- **Không:** join DB chéo

**Q: Mấy database?**  
6 PostgreSQL: `contract_db`, `pricing_db`, `operation_db`, `billing_db`, `workflow_db`, `support_db` (notification + audit + esign).

---

## Gateway & bảo mật

**Q: Gateway làm gì?**  
JWT validate, RBAC, rate limit 120/phút (Redis), idempotency `X-Idempotency-Key`, proxy + header `X-User-Id`, `X-User-Roles`.

**Q: RBAC FE vs BE?**  
FE ẩn menu (`config/rbac.ts`); gateway chặn API thật (`SERVICE_ROLE_REQUIREMENTS`). Gõ URL vẫn 403 nếu sai quyền.

**Q: APR-01 assignee user?**  
Workflow lưu `current_assignee_role` **và** `current_assignee_user_id`. `sale02` cùng role nhưng không phải assignee → 403 (SC-08).

---

## Workflow & state machine

**Q: Workflow config ở đâu?**  
`config/workflow_definitions.json` — engine đọc JSON, không if/else cứng theo document type.

**Q: State machine khác workflow?**  
State machine = trạng thái **entity** (DRAFT, ACTIVE…). Workflow = **ai duyệt bước mấy**. Config: `state_machines.json`.

**Q: Submit HĐ chạy sao?**  
Validate CTR-02 (KH ACTIVE, attachment) → transition DRAFT→UNDER_REVIEW → HTTP start workflow → lưu `workflow_id`.

**Q: Approve xong?**  
Tăng step hoặc APPROVED → callback contract service → contract APPROVED/ACTIVE; outbox emit notification.

---

## Outbox & Kafka

**Q: Tại sao Outbox?**  
Commit DB + event cùng transaction; relay publish Kafka sau — tránh mất notification khi Kafka tạm fail.

**Q: Ai consume?**  
Notification service, Audit service — topic `udpt.domain.events`.

---

## Billing & nghiệp vụ khó

**Q: snapshot_unit_price (SC-04)?**  
Giá chốt trên dòng billing khi tạo/approve; sau approve không đổi dù bảng giá mới.

**Q: SC-10 phụ lục tương lai?**  
Bill tháng T dùng bảng giá/phụ lục **effective trong kỳ T**, không lấy effective sau.

**Q: E-sign fail (PAY-07)?**  
Billing vẫn APPROVED; retry esign từ FAILED.

**Q: PRC overlap (SC-02)?**  
Hai bảng giá EFFECTIVE chồng ngày → 409.

---

## 10 scenario — trả lời một dòng

| ID | Trả lời |
|----|---------|
| SC-01 | Submit không attachment → 422 CTR-02 |
| SC-02 | Overlap price list → 409 |
| SC-03 | Bill HĐ hết hạn → 422 |
| SC-04 | snapshot_unit_price immutable |
| SC-05 | Concurrent approve → 409 version |
| SC-06 | E-sign fail → retry |
| SC-07 | Notification health OK |
| SC-08 | Wrong assignee user → 403 |
| SC-09 | Idempotency key → same response |
| SC-10 | Appendix future → old price in past period |

Chạy: `pytest backend/tests/integration/test_scenarios.py -v`

---

## Câu hỏi bẫy — trả lời trung thực

| Câu hỏi | Trả lời |
|---------|---------|
| Có phải Maersk production? | **Không** — demo enterprise pattern; không full TMS/WMS/GPS |
| User lưu DB? | Demo hard-code gateway; production cần user service |
| Strong consistency toàn hệ thống? | Nghiệp vụ chính sync REST; notification/audit eventual qua Kafka |
| Em làm phần nào? | Xem [TEAM_ASSIGNMENT.md](./TEAM_ASSIGNMENT.md) |

---

## File code nên nhớ

| Chủ đề | File |
|--------|------|
| Gateway | `backend/gateway/app/main.py` |
| Workflow | `backend/services/workflow-service/app/services/workflow_engine.py` |
| Submit HĐ | `backend/services/contract-service/app/services/customer_service.py` |
| Outbox | `backend/libs/udpt_common/udpt_common/outbox.py` |
| State machine | `backend/libs/udpt_common/udpt_common/state_machine.py` |
| FE RBAC | `frontend/src/config/rbac.ts` |

---

## Phân công trình bày

| Thành viên | Phần nói |
|------------|----------|
| **Hien** | Kiến trúc, gateway, contract, outbox, DB-per-service (~2,5 phút) |
| **Khoi** | Workflow, billing, approvals, SC-04/05 (~2,5 phút) |
| **Tan** | Pricing, ops, notification, esign (~2 phút) |
| **Hieu** | Audit only (~1 phút) |

Script demo: [DEMO.md](./DEMO.md)
