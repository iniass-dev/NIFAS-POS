from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.stock import StockMove
from app.schemas.product import (
    CategoryCreate, CategoryResponse, CategoryUpdate,
    ProductCreate, ProductResponse, ProductUpdate, ProductWithStockResponse,
)
from app.utils.security import RequireCashier, RequireManager

router = APIRouter(prefix="/products", tags=["products"])


# --- Categories ---

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: Annotated[AsyncSession, Depends(get_db)], _=RequireCashier):
    result = await db.execute(select(Category).where(Category.active == True).order_by(Category.sequence, Category.name))
    return result.scalars().all()


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(data: CategoryCreate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    cat = Category(**data.model_dump())
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


@router.patch("/categories/{cat_id}", response_model=CategoryResponse)
async def update_category(cat_id: int, data: CategoryUpdate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    cat = await db.get(Category, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    await db.flush()
    await db.refresh(cat)
    return cat


# --- Products ---

def _stock_subquery():
    return (
        select(StockMove.product_id, func.coalesce(func.sum(StockMove.qty), 0).label("qty_on_hand"))
        .group_by(StockMove.product_id)
        .subquery()
    )


@router.get("/", response_model=list[ProductWithStockResponse])
async def list_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    _=RequireCashier,
    search: str | None = Query(None),
    category_id: int | None = Query(None),
    active_only: bool = Query(True),
):
    stock_sq = _stock_subquery()
    q = (
        select(Product, func.coalesce(stock_sq.c.qty_on_hand, 0).label("qty_on_hand"))
        .outerjoin(stock_sq, Product.id == stock_sq.c.product_id)
        .order_by(Product.sequence, Product.name)
    )
    if active_only:
        q = q.where(Product.active == True)
    if search:
        q = q.where(Product.name.ilike(f"%{search}%") | Product.barcode.ilike(f"%{search}%"))
    if category_id:
        q = q.where(Product.category_id == category_id)

    rows = (await db.execute(q)).all()
    return [ProductWithStockResponse(**row[0].__dict__, qty_on_hand=float(row[1])) for row in rows]


@router.get("/barcode/{barcode}", response_model=ProductWithStockResponse)
async def get_by_barcode(barcode: str, db: Annotated[AsyncSession, Depends(get_db)], _=RequireCashier):
    stock_sq = _stock_subquery()
    q = (
        select(Product, func.coalesce(stock_sq.c.qty_on_hand, 0).label("qty_on_hand"))
        .outerjoin(stock_sq, Product.id == stock_sq.c.product_id)
        .where(Product.barcode == barcode, Product.active == True)
    )
    row = (await db.execute(q)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return ProductWithStockResponse(**row[0].__dict__, qty_on_hand=float(row[1]))


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductCreate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    product = Product(**data.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, data: ProductUpdate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return product
