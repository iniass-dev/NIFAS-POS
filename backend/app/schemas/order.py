from datetime import datetime
from pydantic import BaseModel
from app.models.order import OrderState


class OrderLineCreate(BaseModel):
    product_id: int
    qty: float
    unit_price: float
    discount: float = 0


class OrderPaymentCreate(BaseModel):
    payment_method_id: int
    amount: float


class OrderCreate(BaseModel):
    session_id: int
    register_id: int
    lines: list[OrderLineCreate]
    payments: list[OrderPaymentCreate]


class OrderLineResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    qty: float
    unit_price: float
    discount: float
    tax_rate: float
    subtotal: float

    model_config = {"from_attributes": True}


class OrderPaymentResponse(BaseModel):
    id: int
    payment_method_id: int
    payment_method_name: str = ""
    amount: float

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    reference: str
    session_id: int
    register_id: int
    cashier_id: int
    cashier_name: str = ""
    store_name: str | None = None
    store_address: str | None = None
    store_phone: str | None = None
    state: OrderState
    amount_untaxed: float
    amount_tax: float
    amount_total: float
    amount_paid: float
    amount_return: float
    created_at: datetime
    paid_at: datetime | None
    lines: list[OrderLineResponse]
    payments: list[OrderPaymentResponse]

    model_config = {"from_attributes": True}
