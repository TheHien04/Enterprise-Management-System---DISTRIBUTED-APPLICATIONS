"""Integration scenarios SC-01 through SC-10 from config/seed_data.json."""

from __future__ import annotations

import asyncio
import uuid

import pytest

from backend.tests.conftest import (
    add_contract_attachment,
    approve_workflow,
    auth_headers,
    ensure_active_contract,
    ensure_billing_period,
    lock_billing_period,
    submit_contract,
)

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_sc01_submit_contract_without_attachment(http_client, sale01_headers):
    """SC-01: Submit contract without attachment -> HTTP 422."""
    customers_response = await http_client.get("/api/v1/customers/", headers=sale01_headers)
    customers_response.raise_for_status()
    customer = next(
        c for c in customers_response.json()["data"] if c.get("status") == "ACTIVE"
    )

    create_response = await http_client.post(
        "/api/v1/contracts/",
        headers=sale01_headers,
        json={
            "code": f"HD-SC01-{uuid.uuid4().hex[:8]}",
            "customer_id": customer["id"],
            "effective_from": "2026-07-01",
            "effective_to": "2026-12-31",
            "total_value": 1000000,
        },
    )
    assert create_response.status_code == 200, create_response.text
    contract = create_response.json()["data"]

    response = await submit_contract(http_client, sale01_headers, contract["id"])
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert "attachment" in body["error"]["message"].lower()


@pytest.mark.asyncio
async def test_sc02_overlapping_price_list(http_client, sale01_headers):
    """SC-02: Create overlapping price list -> HTTP 409."""
    payload = {
        "contract_code": "HD2026001",
        "version": "v-overlap-test",
        "effective_from": "2026-08-01",
        "effective_to": "2026-09-15",
        "items": [{"service_code": "DV001", "unit_price": 350000}],
    }
    response = await http_client.post(
        "/api/v1/pricing/price-lists",
        headers=sale01_headers,
        json=payload,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_sc03_billing_expired_contract(http_client, sale01_headers, account01_headers):
    """SC-03: Create billing for expired contract period -> HTTP 422."""
    await ensure_active_contract(http_client, sale01_headers, "HD2026001")
    await ensure_billing_period(http_client, sale01_headers, "2027-01")
    response = await http_client.post(
        "/api/v1/billing/billing-sheets/generate",
        headers=account01_headers,
        params={"contract_code": "HD2026001", "period": "2027-01"},
    )
    assert response.status_code == 422
    assert "expired" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_sc04_snapshot_unit_price_unchanged_after_price_list_update(
    http_client, sale01_headers, account01_headers
):
    """SC-04: snapshot_unit_price frozen after billing generated (PAY-03); EFFECTIVE list immutable (PRC-05)."""
    await ensure_active_contract(http_client, sale01_headers, "HD2026001")
    await ensure_billing_period(http_client, sale01_headers, "2026-08")

    generate_response = await http_client.post(
        "/api/v1/billing/billing-sheets/generate",
        headers=account01_headers,
        params={"contract_code": "HD2026001", "period": "2026-08"},
    )
    if generate_response.status_code == 409:
        list_response = await http_client.get(
            "/api/v1/billing/billing-sheets",
            headers=account01_headers,
            params={"contract_code": "HD2026001", "period": "2026-08"},
        )
        list_response.raise_for_status()
        sheet = list_response.json()["data"][0]
    else:
        assert generate_response.status_code == 200, generate_response.text
        sheet = generate_response.json()["data"]

    snapshots_before = {item["service_code"]: item["snapshot_unit_price"] for item in sheet["items"]}

    lists_response = await http_client.get(
        "/api/v1/pricing/price-lists",
        headers=sale01_headers,
        params={"contract_code": "HD2026001"},
    )
    lists_response.raise_for_status()
    effective = next(
        (
            pl
            for pl in lists_response.json()["data"]
            if pl["status"] == "EFFECTIVE"
            and pl["effective_from"] <= "2026-08-15" <= pl["effective_to"]
        ),
        None,
    )
    assert effective is not None, "No EFFECTIVE price list covering Aug/2026"

    # PRC-05: mutating the EFFECTIVE list used for billing must fail
    mutate_response = await http_client.patch(
        f"/api/v1/pricing/price-lists/{effective['id']}",
        headers=sale01_headers,
        json={"items": [{"service_code": "DV003", "unit_price": 999999}]},
    )
    assert mutate_response.status_code == 422, mutate_response.text
    assert "PRC-05" in mutate_response.text or "new version" in mutate_response.text.lower()

    # Creating a new non-overlapping draft must not change existing snapshots
    create_response = await http_client.post(
        "/api/v1/pricing/price-lists",
        headers=sale01_headers,
        json={
            "contract_code": "HD2026001",
            "version": f"v-sc04-{uuid.uuid4().hex[:6]}",
            "effective_from": "2027-01-01",
            "effective_to": "2027-12-31",
            "items": [{"service_code": "DV003", "unit_price": 999999}],
        },
    )
    assert create_response.status_code == 200, create_response.text

    sheet_response = await http_client.get(
        f"/api/v1/billing/billing-sheets/{sheet['id']}",
        headers=account01_headers,
    )
    sheet_response.raise_for_status()
    snapshots_after = {
        item["service_code"]: item["snapshot_unit_price"]
        for item in sheet_response.json()["data"]["items"]
    }
    assert snapshots_after == snapshots_before
    assert snapshots_before.get("DV003") != 999999


@pytest.mark.asyncio
async def test_sc05_concurrent_approve_one_conflict(http_client, sale01_headers):
    """SC-05: Concurrent approve same workflow step -> one HTTP 409."""
    customers_response = await http_client.get("/api/v1/customers/", headers=sale01_headers)
    customers_response.raise_for_status()
    customer = next(c for c in customers_response.json()["data"] if c.get("status") == "ACTIVE")

    create_response = await http_client.post(
        "/api/v1/contracts/",
        headers=sale01_headers,
        json={
            "code": f"HD-SC05-{uuid.uuid4().hex[:8]}",
            "customer_id": customer["id"],
            "effective_from": "2026-07-01",
            "effective_to": "2026-12-31",
            "total_value": 1000000,
        },
    )
    assert create_response.status_code == 200, create_response.text
    contract = create_response.json()["data"]

    await add_contract_attachment(http_client, sale01_headers, contract["id"])
    submit_response = await submit_contract(http_client, sale01_headers, contract["id"])
    assert submit_response.status_code == 200, submit_response.text
    workflow_id = submit_response.json()["data"]["workflow_id"]

    progress_response = await http_client.get(
        f"/api/v1/workflows/{workflow_id}",
        headers=sale01_headers,
    )
    progress_response.raise_for_status()
    version = progress_response.json()["data"]["workflow"]["version"]

    sale_headers = await auth_headers(http_client, "sale01")

    async def approve_once() -> int:
        response = await http_client.post(
            f"/api/v1/workflows/{workflow_id}/approve",
            headers=sale_headers,
            json={"comment": "Concurrent approve"},
            params={"version": version},
        )
        return response.status_code

    statuses = await asyncio.gather(approve_once(), approve_once())
    assert 200 in statuses
    assert 409 in statuses, f"Expected one HTTP 409 for concurrent approve, got {statuses}"


@pytest.mark.asyncio
async def test_sc06_esign_fail_signing_status_failed(
    http_client, sale01_headers, account01_headers, director01_headers
):
    """SC-06: E-sign callback FAILED -> signing_status=FAILED, retry allowed."""
    await ensure_active_contract(http_client, sale01_headers, "HD2026001")
    await ensure_billing_period(http_client, sale01_headers, "2026-08")

    generate_response = await http_client.post(
        "/api/v1/billing/billing-sheets/generate",
        headers=account01_headers,
        params={"contract_code": "HD2026001", "period": "2026-08", "tax_rate": 0},
    )
    if generate_response.status_code == 409:
        sheets = (
            await http_client.get(
                "/api/v1/billing/billing-sheets",
                headers=account01_headers,
                params={"contract_code": "HD2026001", "period": "2026-08"},
            )
        ).json()["data"]
        sheet = sheets[0]
    else:
        assert generate_response.status_code == 200, generate_response.text
        sheet = generate_response.json()["data"]

    sheet_id = sheet["id"]
    # Legacy rows may still be FAILED+REVISION_REQUESTED from older PAY-07 behavior.
    if sheet.get("signing_status") == "FAILED" and sheet.get("approval_status") == "APPROVED":
        retry = await http_client.post(
            f"/api/v1/billing/billing-sheets/{sheet_id}/send-esign",
            headers=account01_headers,
        )
        assert retry.status_code == 200, retry.text
        return

    if sheet.get("approval_status") == "REVISION_REQUESTED":
        reconcile_response = await http_client.post(
            f"/api/v1/billing/billing-sheets/{sheet_id}/reconcile",
            headers=account01_headers,
        )
        assert reconcile_response.status_code == 200, reconcile_response.text

    if sheet.get("approval_status") not in {"SUBMITTED", "APPROVED"}:
        submit_response = await http_client.post(
            f"/api/v1/billing/billing-sheets/{sheet_id}/submit",
            headers=account01_headers,
        )
        assert submit_response.status_code == 200, submit_response.text

    sheet = (
        await http_client.get(
            f"/api/v1/billing/billing-sheets/{sheet_id}",
            headers=account01_headers,
        )
    ).json()["data"]

    if sheet.get("approval_status") != "APPROVED":
        workflows = (
            await http_client.get(
                "/api/v1/workflows/inbox",
                headers=account01_headers,
                params={"role": "ACCOUNTING"},
            )
        ).json()["data"]
        match = next((w for w in workflows if w["document_id"] == sheet_id), None)
        if not match:
            workflows = (
                await http_client.get(
                    "/api/v1/workflows/inbox",
                    headers=director01_headers,
                    params={"role": "DIRECTOR"},
                )
            ).json()["data"]
            match = next((w for w in workflows if w["document_id"] == sheet_id), None)
        assert match, "Billing workflow not found"
        workflow_id = match["id"]
        if match.get("current_assignee_role") == "ACCOUNTING":
            assert (await approve_workflow(http_client, "account01", workflow_id)).status_code == 200
        assert (await approve_workflow(http_client, "director01", workflow_id)).status_code == 200
        sheet = (
            await http_client.get(
                f"/api/v1/billing/billing-sheets/{sheet_id}",
                headers=account01_headers,
            )
        ).json()["data"]

    if sheet.get("signing_status") in {"NONE", "FAILED", "CANCELLED"}:
        esign_response = await http_client.post(
            f"/api/v1/billing/billing-sheets/{sheet_id}/send-esign",
            headers=account01_headers,
        )
        assert esign_response.status_code == 200, esign_response.text

    fail_response = await http_client.post(
        f"/api/v1/billing/billing-sheets/{sheet_id}/complete-esign",
        headers=account01_headers,
        params={"success": False},
    )
    assert fail_response.status_code == 200, fail_response.text
    sheet = fail_response.json()["data"]
    assert sheet["signing_status"] == "FAILED"
    assert sheet["approval_status"] == "APPROVED"

    retry_response = await http_client.post(
        f"/api/v1/billing/billing-sheets/{sheet_id}/send-esign",
        headers=account01_headers,
    )
    assert retry_response.status_code == 200, retry_response.text
    assert retry_response.json()["data"]["signing_status"] == "SIGNING"


@pytest.mark.asyncio
async def test_sc07_outbox_and_notification_resilience(http_client, sale01_headers):
    """SC-07: Business submit OK; outbox records events; notification service remains healthy (APR-07)."""
    before_stats = (
        await http_client.get("/api/v1/workflows/outbox/stats", headers=sale01_headers)
    ).json()["data"]
    before_total = int(before_stats.get("pending", 0)) + int(before_stats.get("published", 0))

    customers_response = await http_client.get("/api/v1/customers/", headers=sale01_headers)
    customers_response.raise_for_status()
    customer = next(c for c in customers_response.json()["data"] if c.get("status") == "ACTIVE")

    contract_code = f"HD-SC07-{uuid.uuid4().hex[:8]}"
    create_response = await http_client.post(
        "/api/v1/contracts/",
        headers=sale01_headers,
        json={
            "code": contract_code,
            "customer_id": customer["id"],
            "effective_from": "2026-07-01",
            "effective_to": "2026-12-31",
            "total_value": 1000000,
        },
    )
    assert create_response.status_code == 200, create_response.text
    contract = create_response.json()["data"]
    await add_contract_attachment(http_client, sale01_headers, contract["id"])
    submit_response = await submit_contract(http_client, sale01_headers, contract["id"])
    assert submit_response.status_code == 200, submit_response.text
    assert submit_response.json()["data"].get("workflow_id"), "Business flow must succeed even if notify lags"

    after_stats = (
        await http_client.get("/api/v1/workflows/outbox/stats", headers=sale01_headers)
    ).json()["data"]
    after_total = int(after_stats.get("pending", 0)) + int(after_stats.get("published", 0))
    assert after_total >= before_total + 1, (
        f"Outbox must retain domain events after submit (before={before_total}, after={after_total})"
    )

    notify_response = await http_client.get("/api/v1/notifications/health", headers=sale01_headers)
    assert notify_response.status_code == 200
    body = notify_response.json()
    assert body.get("status") in {"ok", "degraded"} or body.get("success") is True


@pytest.mark.asyncio
async def test_sc08_wrong_assignee_approve_forbidden(http_client, sale01_headers, legal01_headers):
    """SC-08: Wrong role OR same-role wrong user -> HTTP 403 (APR-01)."""
    customers_response = await http_client.get("/api/v1/customers/", headers=sale01_headers)
    customers_response.raise_for_status()
    customer = next(c for c in customers_response.json()["data"] if c.get("status") == "ACTIVE")

    create_response = await http_client.post(
        "/api/v1/contracts/",
        headers=sale01_headers,
        json={
            "code": f"HD-SC08-{uuid.uuid4().hex[:8]}",
            "customer_id": customer["id"],
            "effective_from": "2026-07-01",
            "effective_to": "2026-12-31",
            "total_value": 1000000,
        },
    )
    assert create_response.status_code == 200, create_response.text
    contract = create_response.json()["data"]
    await add_contract_attachment(http_client, sale01_headers, contract["id"])
    submit_response = await submit_contract(http_client, sale01_headers, contract["id"])
    assert submit_response.status_code == 200, submit_response.text
    workflow_id = submit_response.json()["data"]["workflow_id"]

    # Wrong role
    wrong_role = await http_client.post(
        f"/api/v1/workflows/{workflow_id}/approve",
        headers=legal01_headers,
        json={"comment": "Wrong role approval attempt"},
    )
    assert wrong_role.status_code == 403
    assert wrong_role.json()["error"]["code"] == "FORBIDDEN"

    # Same role, wrong user (sale02 is SALES_STAFF but assignee is sale01)
    sale02_headers = await auth_headers(http_client, "sale02")
    wrong_user = await http_client.post(
        f"/api/v1/workflows/{workflow_id}/approve",
        headers=sale02_headers,
        json={"comment": "Same role, wrong assignee"},
    )
    assert wrong_user.status_code == 403
    assert wrong_user.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_sc09_idempotency_key_double_submit(http_client, sale01_headers):
    """SC-09: Submit twice with same idempotency key -> single workflow instance."""
    customers_response = await http_client.get("/api/v1/customers/", headers=sale01_headers)
    customers_response.raise_for_status()
    customer = next(
        c for c in customers_response.json()["data"] if c.get("status") == "ACTIVE"
    )

    contract_code = f"HD-SC09-{uuid.uuid4().hex[:8]}"
    create_response = await http_client.post(
        "/api/v1/contracts/",
        headers=sale01_headers,
        json={
            "code": contract_code,
            "customer_id": customer["id"],
            "effective_from": "2026-07-01",
            "effective_to": "2026-12-31",
            "total_value": 1000000,
        },
    )
    assert create_response.status_code == 200, create_response.text
    contract = create_response.json()["data"]

    await add_contract_attachment(http_client, sale01_headers, contract["id"])
    idempotency_key = f"sc09-{uuid.uuid4().hex}"
    first = await submit_contract(
        http_client, sale01_headers, contract["id"], idempotency_key=idempotency_key
    )
    second = await submit_contract(
        http_client, sale01_headers, contract["id"], idempotency_key=idempotency_key
    )
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json()["data"]["workflow_id"] == second.json()["data"]["workflow_id"]

    history_response = await http_client.get(
        f"/api/v1/workflows/document/CONTRACT/{contract['id']}/history",
        headers=sale01_headers,
    )
    history_response.raise_for_status()
    submit_actions = [
        entry for entry in history_response.json()["data"] if entry["action"] == "SUBMIT"
    ]
    assert len(submit_actions) == 1


@pytest.mark.asyncio
async def test_sc10_bill_sep_2026_uses_warehouse_price_120000(
    http_client, sale01_headers, ops01_headers, account01_headers
):
    """SC-10: Bill Sep/2026 uses warehouse (DV003) price 120000, not appendix 150000."""
    await ensure_active_contract(http_client, sale01_headers, "HD2026001")
    period = "2026-09"

    periods_response = await http_client.get("/api/v1/operations/periods", headers=ops01_headers)
    periods_response.raise_for_status()
    period_row = next(
        (item for item in periods_response.json()["data"] if item["period"] == period),
        None,
    )
    if not period_row:
        await ensure_billing_period(http_client, sale01_headers, period, lock=False)
        period_row = {"status": "OPEN"}

    if period_row["status"] == "OPEN":
        volume_response = await http_client.post(
            "/api/v1/operations/volumes",
            headers=ops01_headers,
            json={
                "contract_code": "HD2026001",
                "service_code": "DV003",
                "quantity": 30,
                "record_date": "2026-09-15",
                "period": period,
            },
        )
        assert volume_response.status_code == 200, volume_response.text
        await lock_billing_period(http_client, sale01_headers, period)
    elif period_row["status"] in {"RECONCILED", "LOCKED"}:
        volumes_response = await http_client.get(
            "/api/v1/operations/volumes",
            headers=ops01_headers,
            params={"contract_code": "HD2026001", "period": period},
        )
        volumes_response.raise_for_status()
        if not volumes_response.json()["data"]:
            pytest.skip(f"Period {period} locked without volume data")
    else:
        await lock_billing_period(http_client, sale01_headers, period)

    generate_response = await http_client.post(
        "/api/v1/billing/billing-sheets/generate",
        headers=account01_headers,
        params={"contract_code": "HD2026001", "period": "2026-09"},
    )
    if generate_response.status_code == 409:
        sheets = (
            await http_client.get(
                "/api/v1/billing/billing-sheets",
                headers=account01_headers,
                params={"contract_code": "HD2026001", "period": "2026-09"},
            )
        ).json()["data"]
        sheet = sheets[0]
    else:
        assert generate_response.status_code == 200, generate_response.text
        sheet = generate_response.json()["data"]

    warehouse_line = next(
        (item for item in sheet["items"] if item["service_code"] == "DV003"),
        None,
    )
    assert warehouse_line is not None, "DV003 line missing from Sep/2026 billing"
    assert warehouse_line["snapshot_unit_price"] == 120000
    assert warehouse_line["unit_price"] == 120000
    assert warehouse_line["snapshot_unit_price"] != 150000
