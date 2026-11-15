import enum
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionState(str, enum.Enum):
    open = "open"
    closing = "closing"
    closed = "closed"


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # ex: "Caisse 1 - 2024/11/15 09:00"
    register_id: Mapped[int] = mapped_column(Integer, ForeignKey("registers.id"), nullable=False)
    opened_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    closed_by_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    opening_cash: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    closing_cash: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    expected_cash: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)  # calculé à la clôture
    cash_difference: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    state: Mapped[SessionState] = mapped_column(Enum(SessionState), default=SessionState.open, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    register: Mapped["Register"] = relationship("Register", back_populates="sessions")
    opened_by: Mapped["User"] = relationship("User", foreign_keys="CashSession.opened_by_id", back_populates="sessions")
    closed_by: Mapped["User | None"] = relationship("User", foreign_keys="CashSession.closed_by_id")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="session")
