import enum
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentType(str, enum.Enum):
    cash = "cash"
    card = "card"
    check = "check"
    transfer = "transfer"
    voucher = "voucher"
    other = "other"


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[PaymentType] = mapped_column(Enum(PaymentType), default=PaymentType.cash, nullable=False)
    logo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    registers: Mapped[list["RegisterPaymentMethod"]] = relationship("RegisterPaymentMethod", back_populates="payment_method")
    order_payments: Mapped[list["OrderPayment"]] = relationship("OrderPayment", back_populates="payment_method")
