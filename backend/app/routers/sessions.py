from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.order import Order, OrderPayment, OrderState
from app.models.register import Register
from app.models.session import CashSession, SessionState
from app.models.user import User
from app.schemas.session import SessionClose, SessionOpen, SessionResponse, SessionSummary
from app.utils.security import RequireCashier, RequireManager, get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    _=RequireManager,
    store_id: int | None = Query(None),
):
    q = select(CashSession).order_by(CashSession.opened_at.desc()).limit(200)
    if store_id:
        q = q.where(CashSession.register_id.in_(
            select(Register.id).where(Register.store_id == store_id)
        ))
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/open", response_model=list[SessionResponse])
async def open_sessions(db: Annotated[AsyncSession, Depends(get_db)], _=RequireCashier):
    result = await db.execute(select(CashSession).where(CashSession.state == SessionState.open))
    return result.scalars().all()


@router.post("/open", response_model=SessionResponse)
async def open_session(
    data: SessionOpen,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    existing = await db.execute(
        select(CashSession).where(
            CashSession.register_id == data.register_id,
            CashSession.state == SessionState.open,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Une session est déjà ouverte sur cette caisse")

    name = f"Session {data.register_id} - {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
    session = CashSession(
        name=name,
        register_id=data.register_id,
        opened_by_id=current_user.id,
        opening_cash=data.opening_cash,
        state=SessionState.open,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.post("/{session_id}/close", response_model=SessionSummary)
async def close_session(
    session_id: int,
    data: SessionClose,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    session = await db.get(CashSession, session_id)
    if not session or session.state != SessionState.open:
        raise HTTPException(status_code=400, detail="Session introuvable ou déjà fermée")

    # Calcul du total espèces attendu (mode de paiement type=cash)
    from app.models.payment_method import PaymentMethod, PaymentType
    cash_sales_result = await db.execute(
        select(func.coalesce(func.sum(OrderPayment.amount), 0))
        .join(Order, OrderPayment.order_id == Order.id)
        .join(PaymentMethod, OrderPayment.payment_method_id == PaymentMethod.id)
        .where(
            Order.session_id == session_id,
            Order.state == OrderState.paid,
            PaymentMethod.type == PaymentType.cash,
        )
    )
    # Résumé des ventes
    orders_result = await db.execute(
        select(func.count(Order.id), func.coalesce(func.sum(Order.amount_total), 0))
        .where(Order.session_id == session_id, Order.state == OrderState.paid)
    )
    order_count, total_sales = orders_result.first()

    expected_cash = float(session.opening_cash) + float(cash_sales_result.scalar() or 0)
    session.closing_cash = data.closing_cash
    session.expected_cash = expected_cash
    session.cash_difference = data.closing_cash - expected_cash
    session.notes = data.notes
    session.state = SessionState.closed
    session.closed_by_id = current_user.id
    session.closed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(session)
    return SessionSummary(**session.__dict__, order_count=int(order_count or 0), total_sales=float(total_sales or 0))


@router.get("/{session_id}", response_model=SessionSummary)
async def get_session(session_id: int, db: Annotated[AsyncSession, Depends(get_db)], _=RequireCashier):
    session = await db.get(CashSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session introuvable")
    orders_result = await db.execute(
        select(func.count(Order.id), func.coalesce(func.sum(Order.amount_total), 0))
        .where(Order.session_id == session_id, Order.state == OrderState.paid)
    )
    order_count, total_sales = orders_result.first()
    return SessionSummary(**session.__dict__, order_count=int(order_count or 0), total_sales=float(total_sales or 0))
