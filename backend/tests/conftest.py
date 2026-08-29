"""Shared pytest fixtures for UDPT backend tests."""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest

GATEWAY_URL = os.getenv("UDPT_GATEWAY_URL", "http://localhost:8080")

USER_CREDENTIALS: dict[str, tuple[str, str]] = {
    "sale01": ("sale01", "sale01"),
    "sale02": ("sale02", "sale02"),
    "manager01": ("manager01", "manager01"),
    "legal01": ("legal01", "legal01"),
    "account01": ("account01", "account01"),
    "director01": ("director01", "director01"),
    "ops01": ("ops01", "ops01"),
    "admin01": ("admin01", "admin01"),
}

CONTRACT_APPROVAL_CHAIN: list[tuple[str, str]] = [
    ("sale01", "sale01"),
    ("manager01", "manager01"),
    ("legal01", "legal01"),
    ("account01", "account01"),
    ("director01", "director01"),
]


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "integration: integration tests requiring a running UDPT stack",
    )
    config.addinivalue_line(
        "markers",
        "flaky: tests that may be skipped when race timing is unreliable",
    )


@pytest.fixture(scope="session")
def gateway_url() -> str:
    return GATEWAY_URL


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def stack_available(gateway_url: str) -> str:
    """Skip the entire module when the gateway is not reachable."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{gateway_url}/health")
            if response.status_code != 200:
                pytest.skip(f"Gateway unhealthy at {gateway_url} (status {response.status_code})")
    except (httpx.ConnectError, httpx.TimeoutException):
        pytest.skip(f"Gateway not available at {gateway_url}")
    return gateway_url


@pytest.fixture
async def http_client(gateway_url: str, stack_available: str) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(base_url=gateway_url, timeout=30.0) as client:
        yield client


async def login(client: httpx.AsyncClient, username: str, password: str | None = None) -> str:
    pwd = password or username
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": pwd},
    )
    response.raise_for_status()
    return response.json()["access_token"]


async def auth_headers(client: httpx.AsyncClient, username: str) -> dict[str, str]:
    user, password = USER_CREDENTIALS.get(username, (username, username))
    token = await login(client, user, password)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sale01_headers(http_client: httpx.AsyncClient) -> dict[str, str]:
    return await auth_headers(http_client, "sale01")


@pytest.fixture
async def manager01_headers(http_client: httpx.AsyncClient) -> dict[str, str]:
    return await auth_headers(http_client, "manager01")


@pytest.fixture
async def legal01_headers(http_client: httpx.AsyncClient) -> dict[str, str]:
    return await auth_headers(http_client, "legal01")


@pytest.fixture
async def account01_headers(http_client: httpx.AsyncClient) -> dict[str, str]:
    return await auth_headers(http_client, "account01")


@pytest.fixture
async def director01_headers(http_client: httpx.AsyncClient) -> dict[str, str]:
    return await auth_headers(http_client, "director01")


@pytest.fixture
async def ops01_headers(http_client: httpx.AsyncClient) -> dict[str, str]:
    return await auth_headers(http_client, "ops01")


async def get_contract_by_code(
    client: httpx.AsyncClient, headers: dict[str, str], code: str
) -> dict[str, Any]:
    response = await client.get("/api/v1/contracts/", headers=headers)
    response.raise_for_status()
    for contract in response.json()["data"]:
        if contract["code"] == code:
            return contract
    raise AssertionError(f"Contract {code} not found")


async def add_contract_attachment(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    contract_id: str,
    file_name: str = "contract.pdf",
) -> None:
    response = await client.post(
        f"/api/v1/contracts/{contract_id}/attachments",
        headers=headers,
        json={"file_name": file_name, "file_url": f"https://demo/{file_name}"},
    )
    response.raise_for_status()


async def submit_contract(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    contract_id: str,
    idempotency_key: str | None = None,
) -> httpx.Response:
    extra_headers = dict(headers)
    if idempotency_key:
        extra_headers["X-Idempotency-Key"] = idempotency_key
    return await client.post(
        f"/api/v1/contracts/{contract_id}/submit",
        headers=extra_headers,
    )


async def approve_workflow(
    client: httpx.AsyncClient,
    username: str,
    workflow_id: str,
    version: int | None = None,
) -> httpx.Response:
    headers = await auth_headers(client, username)
    params = {"version": version} if version is not None else None
    return await client.post(
        f"/api/v1/workflows/{workflow_id}/approve",
        headers=headers,
        json={"comment": "Approved in integration test"},
        params=params,
    )


async def approve_contract_fully(
    client: httpx.AsyncClient,
    contract_id: str,
    workflow_id: str,
) -> None:
    for username, _ in CONTRACT_APPROVAL_CHAIN:
        response = await approve_workflow(client, username, workflow_id)
        assert response.status_code == 200, response.text


async def activate_due_contracts(client: httpx.AsyncClient, headers: dict[str, str]) -> None:
    response = await client.post("/api/v1/contracts/activate-due", headers=headers)
    response.raise_for_status()


async def ensure_active_contract(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    code: str = "HD2026001",
) -> dict[str, Any]:
    contract = await get_contract_by_code(client, headers, code)
    if contract["status"] in {"ACTIVE", "APPROVED"}:
        if contract["status"] == "APPROVED":
            await activate_due_contracts(client, headers)
            contract = await get_contract_by_code(client, headers, code)
        return contract

    if contract["status"] == "DRAFT":
        await add_contract_attachment(client, headers, contract["id"])
        submit_response = await submit_contract(client, headers, contract["id"])
        assert submit_response.status_code == 200, submit_response.text
        contract = submit_response.json()["data"]
    elif contract["status"] == "UNDER_REVIEW" and contract.get("workflow_id"):
        pass
    else:
        pytest.skip(f"Contract {code} in unexpected state: {contract['status']}")

    workflow_id = contract.get("workflow_id")
    if not workflow_id:
        contract = await get_contract_by_code(client, headers, code)
        workflow_id = contract.get("workflow_id")
    if not workflow_id:
        pytest.skip(f"No workflow for contract {code}")

    if contract["status"] == "UNDER_REVIEW":
        await approve_contract_fully(client, contract["id"], workflow_id)
        await activate_due_contracts(client, headers)

    contract = await get_contract_by_code(client, headers, code)
    if contract["status"] not in {"ACTIVE", "APPROVED"}:
        pytest.skip(f"Could not activate contract {code}: status={contract['status']}")
    return contract


async def ensure_billing_period(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    period: str,
    *,
    lock: bool = True,
) -> None:
    # Operations API is restricted to OPERATIONS/DIRECTOR/ADMIN roles.
    ops_headers = await auth_headers(client, "ops01")
    periods_response = await client.get("/api/v1/operations/periods", headers=ops_headers)
    periods_response.raise_for_status()
    periods = periods_response.json()["data"]
    match = next((item for item in periods if item["period"] == period), None)
    if not match:
        create_response = await client.post(
            "/api/v1/operations/periods",
            headers=ops_headers,
            json={"period": period},
        )
        assert create_response.status_code == 200, create_response.text
        match = create_response.json()["data"]
    if lock and match["status"] not in {"RECONCILED", "LOCKED"}:
        lock_response = await client.post(
            f"/api/v1/operations/periods/{period}/lock",
            headers=ops_headers,
        )
        assert lock_response.status_code == 200, lock_response.text
    elif lock and match["status"] == "RECONCILED":
        lock_response = await client.post(
            f"/api/v1/operations/periods/{period}/lock",
            headers=ops_headers,
        )
        assert lock_response.status_code == 200, lock_response.text


async def lock_billing_period(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    period: str,
) -> None:
    await ensure_billing_period(client, headers, period, lock=True)
