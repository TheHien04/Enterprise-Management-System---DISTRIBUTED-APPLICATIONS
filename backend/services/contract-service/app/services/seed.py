from datetime import date

from udpt_common.config_loader import load_json_config

from app.models.entities import Contract, ContractAppendix, ContractAttachment, Customer
from app.repositories.customer_repo import (
    AppendixRepository,
    ContractRepository,
    CustomerRepository,
)


async def seed_demo_data(session):
    customer_repo = CustomerRepository(session)
    contract_repo = ContractRepository(session)
    appendix_repo = AppendixRepository(session)
    seed = load_json_config("seed_data.json")

    if not await customer_repo.list_all():
        for item in seed.get("customers", []):
            await customer_repo.add(
                Customer(
                    code=item["code"],
                    name=item["name"],
                    tax_code=item.get("tax_code"),
                    customer_type=item.get("type"),
                    status=item.get("status", "ACTIVE"),
                )
            )

    customers = {c.code: c for c in await customer_repo.list_all()}
    for item in seed.get("contracts", []):
        existing = await contract_repo.get_by_code(item["code"])
        if existing:
            if item["code"] == "HD2026001":
                existing.status = "ACTIVE"
            continue
        customer = customers.get(item["customer_code"])
        if not customer:
            continue
        status = "ACTIVE" if item["code"] == "HD2026001" else "DRAFT"
        await contract_repo.add(
            Contract(
                code=item["code"],
                customer_id=customer.id,
                title=f"Hop dong {item['code']}",
                effective_from=date.fromisoformat(item["effective_from"]),
                effective_to=date.fromisoformat(item["effective_to"]),
                total_value=item.get("total_value", 0),
                status=status,
            )
        )

    appendix_seed = seed.get("appendix")
    if appendix_seed:
        contract = await contract_repo.get_by_code(appendix_seed["contract_code"])
        if contract:
            appendices = await appendix_repo.list_by_contract(contract.id)
            if not any(a.code == "PL001" for a in appendices):
                await appendix_repo.add(
                    ContractAppendix(
                        code="PL001",
                        contract_id=contract.id,
                        title="Phu luc dieu chinh gia luu kho",
                        change_summary="Dieu chinh don gia luu kho theo phu luc PL001",
                        effective_date=date.fromisoformat(appendix_seed["effective_date"]),
                        status="EFFECTIVE",
                        field_name=appendix_seed.get("field_name"),
                        before_value=appendix_seed.get("before_value"),
                        after_value=appendix_seed.get("after_value"),
                    )
                )
            contract = await contract_repo.get_by_id(contract.id)
            if contract and not contract.attachments:
                session = contract_repo.session
                session.add(
                    ContractAttachment(
                        contract_id=contract.id,
                        file_name="HD2026001-hop-dong.pdf",
                        file_url="minio://contracts/HD2026001/hop-dong.pdf",
                    )
                )
                await session.flush()
