from datetime import date, datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.order import Order, OrderLine, OrderPayment, OrderState
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.register import Register
from app.schemas.dashboard import DashboardResponse, PaymentBreakdown, RevenueByDay, SalesSummary, TopProduct
from app.utils.security import RequireManager

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    _=RequireManager,
    date_from: date = Query(default_factory=lambda: date.today().replace(day=1)),
    date_to: date = Query(default_factory=date.today),
    store_id: int | None = Query(None),
):
    dt_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
    dt_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)

    base_filter = [Order.state == OrderState.paid, Order.paid_at.between(dt_from, dt_to)]
    if store_id:
        base_filter.append(Order.register_id.in_(
            select(Register.id).where(Register.store_id == store_id)
        ))

    # Résumé global
    summary_result = await db.execute(
        select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.amount_total), 0),
            func.coalesce(func.sum(Order.amount_tax), 0),
        ).where(*base_filter)
    )
    total_orders, total_revenue, total_tax = summary_result.first()
    total_orders = int(total_orders or 0)
    total_revenue = float(total_revenue or 0)
    total_tax = float(total_tax or 0)
    average_basket = total_revenue / total_orders if total_orders else 0

    # Top produits
    top_result = await db.execute(
        select(
            Product.id,
            Product.name,
            func.sum(OrderLine.qty).label("qty_sold"),
            func.sum(OrderLine.subtotal).label("revenue"),
        )
        .join(OrderLine, Product.id == OrderLine.product_id)
        .join(Order, OrderLine.order_id == Order.id)
        .where(*base_filter)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderLine.subtotal).desc())
        .limit(10)
    )
    top_products = [
        TopProduct(product_id=r[0], product_name=r[1], qty_sold=float(r[2]), revenue=float(r[3]))
        for r in top_result.all()
    ]

    # CA par jour
    revenue_by_day_result = await db.execute(
        select(
            func.date(Order.paid_at).label("day"),
            func.sum(Order.amount_total).label("revenue"),
            func.count(Order.id).label("order_count"),
        )
        .where(*base_filter)
        .group_by(func.date(Order.paid_at))
        .order_by(func.date(Order.paid_at))
    )
    revenue_by_day = [
        RevenueByDay(date=r[0], revenue=float(r[1]), order_count=int(r[2]))
        for r in revenue_by_day_result.all()
    ]

    # Répartition paiements
    payment_result = await db.execute(
        select(
            PaymentMethod.name,
            func.sum(OrderPayment.amount).label("amount"),
            func.count(OrderPayment.id).label("count"),
        )
        .join(OrderPayment, PaymentMethod.id == OrderPayment.payment_method_id)
        .join(Order, OrderPayment.order_id == Order.id)
        .where(*base_filter)
        .group_by(PaymentMethod.name)
        .order_by(func.sum(OrderPayment.amount).desc())
    )
    payment_breakdown = [
        PaymentBreakdown(payment_method=r[0], amount=float(r[1]), count=int(r[2]))
        for r in payment_result.all()
    ]

    return DashboardResponse(
        summary=SalesSummary(
            total_revenue=total_revenue,
            total_orders=total_orders,
            average_basket=average_basket,
            total_tax=total_tax,
        ),
        top_products=top_products,
        revenue_by_day=revenue_by_day,
        payment_breakdown=payment_breakdown,
    )
