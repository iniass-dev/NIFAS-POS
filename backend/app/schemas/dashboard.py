from datetime import date
from pydantic import BaseModel


class SalesSummary(BaseModel):
    total_revenue: float
    total_orders: int
    average_basket: float
    total_tax: float


class TopProduct(BaseModel):
    product_id: int
    product_name: str
    qty_sold: float
    revenue: float


class RevenueByDay(BaseModel):
    date: date
    revenue: float
    order_count: int


class PaymentBreakdown(BaseModel):
    payment_method: str
    amount: float
    count: int


class DashboardResponse(BaseModel):
    summary: SalesSummary
    top_products: list[TopProduct]
    revenue_by_day: list[RevenueByDay]
    payment_breakdown: list[PaymentBreakdown]
