import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BillingPeriod(Base):
    __tablename__ = "billing_periods"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    period: Mapped[str] = mapped_column(String(7), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class VolumeRecord(Base):
    __tablename__ = "volume_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_code: Mapped[str] = mapped_column(String(32), index=True)
    service_code: Mapped[str] = mapped_column(String(32), index=True)
    quantity: Mapped[float] = mapped_column(Numeric(18, 2))
    record_date: Mapped[date] = mapped_column(Date)
    period: Mapped[str] = mapped_column(String(7), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
