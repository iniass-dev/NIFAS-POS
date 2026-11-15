import traceback
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.order import Order, OrderLine, OrderPayment, OrderState
from app.models.product import Product
from app.models.session import CashSession, SessionState
from app.models.stock import StockMove, StockMoveType
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse
from app.utils.security import RequireCashier, get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        return await _create_order_inner(data, db, current_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ERREUR: {type(e).__name__}: {e}\n{traceback.format_exc()}")


async def _create_order_inner(data, db, current_user):
    session = await db.get(CashSession, data.session_id)
    if not session or session.state != SessionState.open:
        raise HTTPException(status_code=400, detail="Session fermée ou introuvable")

    # Génération référence
    count_result = await db.execute(select(Order).where(Order.session_id == data.session_id))
    order_count = len(count_result.scalars().all())
    reference = f"CMD/{data.session_id:04d}/{order_count + 1:04d}"

    order = Order(
        reference=reference,
        session_id=data.session_id,
        register_id=data.register_id,
        cashier_id=current_user.id,
        state=OrderState.draft,
    )
    db.add(order)
    await db.flush()

    amount_untaxed = 0.0
    amount_tax = 0.0

    for line_data in data.lines:
        product = await db.get(Product, line_data.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {line_data.product_id} introuvable")

        price_after_discount = line_data.unit_price * (1 - line_data.discount / 100)
        subtotal = round(price_after_discount * line_data.qty, 2)
        tax_amount = round(subtotal * float(product.tax_rate) / 100, 2)
        amount_untaxed += subtotal
        amount_tax += tax_amount

        line = OrderLine(
            order_id=order.id,
            product_id=line_data.product_id,
            product_name=product.name,
            qty=line_data.qty,
            unit_price=line_data.unit_price,
            discount=line_data.discount,
            tax_rate=product.tax_rate,
            subtotal=subtotal,
        )
        db.add(line)

        # Mouvement de stock automatique
        if product.track_stock:
            stock_result = await db.execute(
                select(StockMove.qty_after)
                .where(StockMove.product_id == product.id)
                .order_by(StockMove.id.desc())
                .limit(1)
            )
            qty_before = float(stock_result.scalar() or 0)
            qty_after = qty_before - line_data.qty
            db.add(StockMove(
                product_id=product.id,
                type=StockMoveType.out,
                qty=-line_data.qty,
                qty_before=qty_before,
                qty_after=qty_after,
                reference=reference,
                user_id=current_user.id,
            ))

    amount_total = round(amount_untaxed + amount_tax, 2)
    amount_paid = sum(p.amount for p in data.payments)
    amount_return = round(max(0, amount_paid - amount_total), 2)

    order.amount_untaxed = amount_untaxed
    order.amount_tax = amount_tax
    order.amount_total = amount_total
    order.amount_paid = amount_paid
    order.amount_return = amount_return
    order.state = OrderState.paid
    order.paid_at = datetime.now(timezone.utc)

    for payment_data in data.payments:
        db.add(OrderPayment(
            order_id=order.id,
            payment_method_id=payment_data.payment_method_id,
            amount=payment_data.amount,
        ))

    await db.flush()

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.lines), selectinload(Order.payments))
        .where(Order.id == order.id)
    )
    return result.scalar_one()


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: Annotated[AsyncSession, Depends(get_db)], _=RequireCashier):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.lines), selectinload(Order.payments))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return order
