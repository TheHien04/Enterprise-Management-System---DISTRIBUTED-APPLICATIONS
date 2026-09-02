# Luồng xử lý chi tiết (Request Flows)

Sequence diagram và mô tả từng bước — dùng khi vẽ slide hoặc trả lời "luồng chạy thế nào".

---

## 1. Login & request qua Gateway

```mermaid
sequenceDiagram
    participant FE as Frontend :5173
    participant GW as API Gateway :8080
    participant SVC as Microservice

    FE->>GW: POST /api/v1/auth/login
    GW->>GW: DEMO_USERS + create JWT
    GW-->>FE: access_token + roles

    FE->>GW: GET /api/v1/contracts + Bearer JWT
    GW->>GW: decode JWT, RBAC, rate limit
    GW->>SVC: proxy + X-User-Id, X-User-Roles
    SVC->>SVC: business logic + own DB
    SVC-->>GW: JSON response
    GW-->>FE: JSON response
```

**Header gateway gửi xuống service:** `X-User-Id`, `X-User-Roles`, (tuỳ chọn) `X-Idempotency-Key`.

---

## 2. Submit hợp đồng + start workflow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant GW as Gateway
    participant CS as Contract :8001
    participant WS as Workflow :8005
    participant K as Kafka

    FE->>GW: POST /contracts/{id}/submit
    GW->>CS: proxy
    CS->>CS: CTR-02 validate, state DRAFT→UNDER_REVIEW
    CS->>WS: POST start workflow CONTRACT
    WS->>WS: WorkflowInstance + assignee step 1
    WS->>WS: outbox WORKFLOW_SUBMITTED (same TX)
    WS-->>CS: workflow id
    CS->>CS: save workflow_id, audit SUBMIT
    CS-->>FE: contract UNDER_REVIEW

    Note over WS,K: Background relay
    WS->>K: publish outbox events
    K->>K: Notification + Audit consumers
```

**File chính:**  
- `customer_service.py` → `submit_contract`  
- `workflow_engine.py` → `start`  
- `outbox.py` → `enqueue_domain_event`

---

## 3. Approve workflow (một bước)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant GW as Gateway
    participant WS as Workflow :8005
    participant CS as Contract :8001
    participant K as Kafka

    FE->>GW: POST /workflows/{id}/approve?version=N
    GW->>WS: proxy
    WS->>WS: check assignee role + user (APR-01)
    WS->>WS: check version (SC-05)
    WS->>WS: log APPROVE, next step or APPROVED
    alt còn bước tiếp
        WS->>WS: outbox WORKFLOW_STEP_ADVANCED
    else hết bước
        WS->>CS: callback APPROVED (internal API)
        CS->>CS: contract APPROVED → ACTIVE if due
        WS->>WS: outbox WORKFLOW_APPROVED
    end
    WS-->>FE: updated workflow
    WS->>K: relay outbox
```

**Reject / Request revision:** callback `REJECTED` / `REVISION_REQUESTED` tương tự; reject bắt buộc comment APR-03.

---

## 4. Tạo billing sheet

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant GW as Gateway
    participant BS as Billing :8004
    participant OS as Operation :8003
    participant PS as Pricing :8002
    participant CS as Contract :8001

    FE->>GW: POST /billing-sheets (generate)
    GW->>BS: proxy
    BS->>OS: GET volumes for period
    BS->>PS: GET effective price lists
    BS->>CS: GET contract + appendices
    BS->>BS: calculate lines + snapshot_unit_price
    BS->>BS: save billing_db
    BS-->>FE: billing sheet DRAFT/CALCULATED
```

**Rules:** PAY-01→07; SC-04 snapshot; SC-03 contract expired; SC-10 appendix effective date.

---

## 5. E-sign async

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant GW as Gateway
    participant BS as Billing :8004
    participant ES as E-Sign :8008

    FE->>GW: POST billing send-esign
    GW->>BS: proxy
    BS->>ES: create signing session
    ES->>ES: async simulate sign
    alt success
        ES->>BS: callback complete-esign SIGNED
        BS->>BS: signing_status SIGNED
    else fail SC-06
        ES->>BS: callback FAILED
        BS->>BS: approval stays APPROVED, signing FAILED
    end
```

Retry: `send-esign` từ FAILED → PENDING_SEND (PAY-07).

---

## 6. Idempotency (SC-09)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant GW as Gateway
    participant WS as Workflow

    FE->>GW: POST submit + X-Idempotency-Key: abc
    GW->>GW: Redis miss → forward
    GW->>WS: forward
    WS-->>GW: 200 + body
    GW->>GW: Redis setex 24h

    FE->>GW: POST submit + same key abc
    GW->>GW: Redis hit
    GW-->>FE: cached 200 (no double workflow)
```

Gateway: `backend/gateway/app/main.py` lines ~130–173.  
Workflow: `idempotency_key` column duplicate check.

---

## 7. Audit timeline (Activity panel)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant GW as Gateway
    participant AS as Audit :8007

    FE->>GW: GET /audit?entity_type=CONTRACT&entity_id=...
    GW->>GW: AUDIT_READ_ROLES (GET)
    GW->>AS: proxy
    AS->>AS: query audit_logs
    AS-->>FE: chronological events
```

Events được ghi qua: `log_audit()` HTTP và/hoặc Kafka consumer từ domain events.

---

## 8. Expiry scheduler (contract-service)

Background task (~5 phút):

- `APPROVED` + `effective_from <= today` → `ACTIVE`
- `ACTIVE` + `effective_to < today` → `EXPIRED`
- Price lists nearing expiry → feed Exceptions UI (via API list + frontend aggregate)

File: `backend/services/contract-service/app/services/expiry_service.py`

---

## Liên kết

| Tài liệu | Nội dung |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Nguyên tắc thiết kế |
| [SERVICE_MAP.md](./SERVICE_MAP.md) | UC → folder |
| [DEMO.md](./DEMO.md) | Script trình bày |
| [DEFENSE_GUIDE.md](./DEFENSE_GUIDE.md) | Q&A vấn đáp |
