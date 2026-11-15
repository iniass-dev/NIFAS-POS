import enum
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrderState(str, enum.Enum):
    draft = "draft"
    paid = "paid"
    cancelled = "cancelled"
    refunded = "refunded"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("cash_sessions.id"), nullable=False)
    register_id: Mapped[int] = mapped_column(Integer, ForeignKey("registers.id"), nullable=False)
    cashier_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    state: Mapped[OrderState] = mapped_column(Enum(OrderState), default=OrderState.draft, nullable=False)
    amount_untaxed: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    amount_tax: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    amount_total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    amount_return: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    session: Mapped["CashSession"] = relationship("CashSession", back_populates="orders")
    register: Mapped["Register"] = relationship("Register", back_populates="orders")
    cashier: Mapped["User"] = relationship("User", back_populates="orders")
    lines: Mapped[list["OrderLine"]] = relationship("OrderLine", back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["OrderPayment"]] = relationship("OrderPayment", back_populates="order", cascade="all, delete-orphan")


class OrderLine(Base):
    __tablename__ = "order_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)  # snapshot nom au moment de la vente
    qty: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)  # %
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="lines")
    product: Mapped["Product"] = relationship("Product", back_populates="order_lines")


class OrderPayment(Base):
    __tablename__ = "order_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=False)
    payment_method_id: Mapped[int] = mapped_column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship("Order", back_populates="payments")
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod", back_populates="order_payments")
