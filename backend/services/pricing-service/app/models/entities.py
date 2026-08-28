import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ServiceCatalog(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    unit: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PriceList(Base):
    __tablename__ = "price_lists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_code: Mapped[str] = mapped_column(String(32), index=True)
    version: Mapped[str] = mapped_column(String(16))
    effective_from: Mapped[date] = mapped_column(Date)
    effective_to: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["PriceListItem"]] = relationship(back_populates="price_list", cascade="all, delete-orphan")


class PriceListItem(Base):
    __tablename__ = "price_list_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    price_list_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("price_lists.id"))
    service_code: Mapped[str] = mapped_column(String(32))
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2))

    price_list: Mapped["PriceList"] = relationship(back_populates="items")
