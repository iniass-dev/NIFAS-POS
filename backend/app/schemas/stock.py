from datetime import datetime
from pydantic import BaseModel
from app.models.stock import StockMoveType


class StockAdjustment(BaseModel):
    product_id: int
    qty: float  # nouvelle quantité théorique
    note: str | None = None


class StockMoveResponse(BaseModel):
    id: int
    product_id: int
    type: StockMoveType
    qty: float
    qty_before: float
    qty_after: float
    reference: str | None
    note: str | None
    user_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StockLevelResponse(BaseModel):
    product_id: int
    product_name: str
    barcode: str | None
    qty_on_hand: float
