from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Register(Base):
    __tablename__ = "registers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    store_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("stores.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    store: Mapped["Store | None"] = relationship("Store", back_populates="registers")
    payment_methods: Mapped[list["RegisterPaymentMethod"]] = relationship("RegisterPaymentMethod", back_populates="register")
    sessions: Mapped[list["CashSession"]] = relationship("CashSession", back_populates="register")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="register")


class RegisterPaymentMethod(Base):
    __tablename__ = "register_payment_methods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    register_id: Mapped[int] = mapped_column(Integer, ForeignKey("registers.id"), nullable=False)
    payment_method_id: Mapped[int] = mapped_column(Integer, ForeignKey("payment_methods.id"), nullable=False)

    register: Mapped["Register"] = relationship("Register", back_populates="payment_methods")
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod", back_populates="registers")
