from sqlalchemy.orm import DeclarativeBase
from udpt_common.outbox import make_outbox_model


class Base(DeclarativeBase):
    pass


OutboxEvent = make_outbox_model(Base)

__all__ = ["Base", "OutboxEvent"]
