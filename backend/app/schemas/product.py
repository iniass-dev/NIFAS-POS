from datetime import datetime
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    parent_id: int | None = None
    color: str | None = None
    sequence: int = 10


class CategoryUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    color: str | None = None
    sequence: int | None = None
    active: bool | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None
    color: str | None
    active: bool
    sequence: int

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    barcode: str | None = None
    reference: str | None = None
    description: str | None = None
    category_id: int | None = None
    price: float
    cost: float = 0
    tax_rate: float = 0
    image_url: str | None = None
    track_stock: bool = True
    sequence: int = 10


class ProductUpdate(BaseModel):
    name: str | None = None
    barcode: str | None = None
    reference: str | None = None
    description: str | None = None
    category_id: int | None = None
    price: float | None = None
    cost: float | None = None
    tax_rate: float | None = None
    image_url: str | None = None
    track_stock: bool | None = None
    active: bool | None = None
    sequence: int | None = None


class ProductResponse(BaseModel):
    id: int
    name: str
    barcode: str | None
    reference: str | None
    category_id: int | None
    price: float
    cost: float
    tax_rate: float
    track_stock: bool
    active: bool
    sequence: int
    image_url: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductWithStockResponse(ProductResponse):
    qty_on_hand: float = 0
