from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.product import Product
from app.models.stock import StockMove, StockMoveType
from app.models.user import User
from app.schemas.stock import StockAdjustment, StockLevelResponse, StockMoveResponse
from app.utils.security import RequireManager, get_current_user

router = APIRouter(prefix="/stock", tags=["stock"])


async def _get_current_stock(db: AsyncSession, product_id: int) -> float:
    result = await db.execute(
        select(func.coalesce(func.sum(StockMove.qty), 0)).where(StockMove.product_id == product_id)
    )
    return float(result.scalar())


@router.get("/levels", response_model=list[StockLevelResponse])
async def stock_levels(db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    q = (
        select(
            Product.id,
            Product.name,
            Product.barcode,
            func.coalesce(func.sum(StockMove.qty), 0).label("qty_on_hand"),
        )
        .outerjoin(StockMove, Product.id == StockMove.product_id)
        .where(Product.active == True, Product.track_stock == True)
        .group_by(Product.id, Product.name, Product.barcode)
        .order_by(Product.name)
    )
    rows = (await db.execute(q)).all()
    return [StockLevelResponse(product_id=r[0], product_name=r[1], barcode=r[2], qty_on_hand=float(r[3])) for r in rows]


@router.post("/adjust", response_model=StockMoveResponse)
async def adjust_stock(
    data: StockAdjustment,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    _=RequireManager,
):
    product = await db.get(Product, data.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    qty_before = await _get_current_stock(db, data.product_id)
    qty_delta = data.qty - qty_before

    move = StockMove(
        product_id=data.product_id,
        type=StockMoveType.adjustment,
        qty=qty_delta,
        qty_before=qty_before,
        qty_after=data.qty,
        note=data.note,
        user_id=current_user.id,
    )
    db.add(move)
    await db.flush()
    await db.refresh(move)
    return move


@router.get("/{product_id}/moves", response_model=list[StockMoveResponse])
async def product_moves(product_id: int, db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    result = await db.execute(
        select(StockMove)
        .where(StockMove.product_id == product_id)
        .order_by(StockMove.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()
