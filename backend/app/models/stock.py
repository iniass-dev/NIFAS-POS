import enum
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StockMoveType(str, enum.Enum):
    in_ = "in"           # entrée stock (réception)
    out = "out"          # sortie stock (vente)
    adjustment = "adjustment"  # ajustement inventaire
    loss = "loss"        # perte/casse


class StockMove(Base):
    __tablename__ = "stock_moves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    type: Mapped[StockMoveType] = mapped_column(Enum(StockMoveType), nullable=False)
    qty: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)  # positif = entrée, négatif = sortie
    qty_before: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)  # stock avant mouvement
    qty_after: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)   # stock après mouvement
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)  # ex: "Commande #123"
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product"] = relationship("Product", back_populates="stock_moves")
    user: Mapped["User | None"] = relationship("User", back_populates="stock_moves")
