from decimal import Decimal

from udpt_common.config_loader import load_json_config

from app.models.entities import BillingSheet, BillingSheetItem
from app.repositories.billing_repo import BillingSheetRepository


async def seed_demo_data(session):
    repo = BillingSheetRepository(session)
    seed = load_json_config("seed_data.json")
    billing_seed = seed.get("billing_aug_2026")
    if not billing_seed:
        return
    contract_code = billing_seed["contract_code"]
    period = billing_seed["period"]
    if await repo.get_by_contract_period(contract_code, period):
        return
    items = []
    subtotal = Decimal("0")
    for item in billing_seed.get("items", []):
        amount = Decimal(str(item["quantity"])) * Decimal(str(item["unit_price"]))
        subtotal += amount
        items.append(
            BillingSheetItem(
                service_code=item["service_code"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                snapshot_unit_price=item["unit_price"],
                amount=float(amount),
            )
        )
    tax_rate = Decimal(str(billing_seed.get("tax_rate", 0)))
    tax_amount = subtotal * tax_rate
    total = subtotal + tax_amount
    await repo.add(
        BillingSheet(
            contract_code=contract_code,
            period=period,
            tax_rate=float(tax_rate),
            subtotal=float(subtotal),
            tax_amount=float(tax_amount),
            total=float(total),
            approval_status="CALCULATED",
            signing_status="NONE",
            issuance_status="DRAFT",
            items=items,
        )
    )
