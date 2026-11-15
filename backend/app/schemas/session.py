from datetime import datetime
from pydantic import BaseModel
from app.models.session import SessionState


class SessionOpen(BaseModel):
    register_id: int
    opening_cash: float = 0


class SessionClose(BaseModel):
    closing_cash: float
    notes: str | None = None


class SessionResponse(BaseModel):
    id: int
    name: str
    register_id: int
    opened_by_id: int
    state: SessionState
    opening_cash: float
    closing_cash: float | None
    expected_cash: float | None
    cash_difference: float | None
    opened_at: datetime
    closed_at: datetime | None

    model_config = {"from_attributes": True}


class SessionSummary(SessionResponse):
    order_count: int = 0
    total_sales: float = 0
