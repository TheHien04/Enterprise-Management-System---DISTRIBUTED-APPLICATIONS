import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BillingSheet(Base):
    __tablename__ = "billing_sheets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_code: Mapped[str] = mapped_column(String(32), index=True)
    period: Mapped[str] = mapped_column(String(7), index=True)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0)
    subtotal: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    approval_status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    signing_status: Mapped[str] = mapped_column(String(32), default="NONE")
    issuance_status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["BillingSheetItem"]] = relationship(
        back_populates="billing_sheet", cascade="all, delete-orphan"
    )
    adjustments: Mapped[list["BillingAdjustment"]] = relationship(
        back_populates="billing_sheet", cascade="all, delete-orphan"
    )


class BillingSheetItem(Base):
    __tablename__ = "billing_sheet_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    billing_sheet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("billing_sheets.id"))
    service_code: Mapped[str] = mapped_column(String(32))
    quantity: Mapped[float] = mapped_column(Numeric(18, 2))
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2))
    snapshot_unit_price: Mapped[float] = mapped_column(Numeric(18, 2))  # PAY-03 immutable snapshot
    amount: Mapped[float] = mapped_column(Numeric(18, 2))

    billing_sheet: Mapped["BillingSheet"] = relationship(back_populates="items")


class BillingAdjustment(Base):
    __tablename__ = "billing_adjustments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    billing_sheet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("billing_sheets.id"))
    adjustment_type: Mapped[str] = mapped_column(String(32))
    service_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    quantity_delta: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    amount_delta: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    reason: Mapped[str] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    billing_sheet: Mapped["BillingSheet"] = relationship(back_populates="adjustments")
