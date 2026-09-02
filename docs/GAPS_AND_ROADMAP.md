# Phạm vi hoàn thiện & hướng mở rộng

Tài liệu trung thực về **đã làm đủ cho UDPT 10+** và **chưa làm (production)** — dùng khi hội đồng hỏi "còn thiếu gì".

---

## Đã hoàn thiện (đủ bảo vệ)

| Hạng mục | Trạng thái |
|----------|------------|
| UC-01 → UC-10 | ✅ Backend + FE demo |
| Database-per-service (6 DB) | ✅ |
| API Gateway JWT + RBAC + rate limit + idempotency | ✅ |
| Workflow config JSON + assignee user APR-01 | ✅ |
| State machine config JSON | ✅ |
| Transactional outbox → Kafka | ✅ |
| Notification + Audit consumers | ✅ |
| E-sign async + retry PAY-07 | ✅ |
| Integration SC-01 → SC-10 | ✅ |
| FE enterprise (Exceptions, Cmd+K, timeline, i18n) | ✅ |
| Docker Compose + K8s manifests | ✅ |
| Tài liệu TEAM / DEMO / DEFENSE / FLOWS | ✅ |

---

## Giới hạn demo (nói thẳng khi vấn đáp)

| Hạng mục | Hiện trạng | Lý do chấp nhận |
|----------|------------|-----------------|
| User/account | Hard-code `DEMO_USERS` ở gateway | Đủ demo RBAC; production cần user-service |
| Attachment HĐ | Demo URL MinIO, chưa upload file UI đầy đủ | Đủ CTR-02 validate |
| Notification realtime | Poll 30s, chưa WebSocket | Đủ UC-09 async Kafka |
| Notification + Audit DB | Cùng `support_db` | Logic tách service; có thể tách DB sau |
| TMS/WMS/GPS | Không có | Ngoài phạm vi đề BMS logistics |
| SSO / multi-tenant | Không có | Ngoài phạm vi môn học |

---

## Hướng mở rộng (optional sau môn)

1. **User service** — DB users, password hash, org hierarchy  
2. **WebSocket** — push notification realtime  
3. **E2E tests** — Playwright trên flow sale01 → director01  
4. **File upload UI** — MinIO presigned URL từ contract-service  
5. **Tách `audit_db`** — tách DB support thành 3 DB riêng  

---

## Checklist trước nộp báo cáo

- [ ] `make up` chạy ổn  
- [ ] Đọc [DEMO.md](./DEMO.md) — mỗi thành viên demo phần owner  
- [ ] Đọc [TEAM_ASSIGNMENT.md](./TEAM_ASSIGNMENT.md) — khớp với báo cáo phân công  
- [ ] `pytest backend/tests/integration/test_scenarios.py -v` pass  
- [ ] Báo cáo PDF khớp kiến trúc [ARCHITECTURE.md](./ARCHITECTURE.md)
