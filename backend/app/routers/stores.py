from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.store import Store
from app.utils.security import RequireAdmin, RequireManager

router = APIRouter(prefix="/stores", tags=["stores"])


class StoreCreate(BaseModel):
    name: str
    address: str | None = None
    city: str | None = None
    phone: str | None = None


class StoreUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    active: bool | None = None


class StoreResponse(BaseModel):
    id: int
    name: str
    address: str | None
    city: str | None
    phone: str | None
    active: bool

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[StoreResponse])
async def list_stores(db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    result = await db.execute(select(Store).order_by(Store.name))
    return result.scalars().all()


@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(data: StoreCreate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireAdmin):
    store = Store(**data.model_dump())
    db.add(store)
    await db.flush()
    await db.refresh(store)
    return store


@router.patch("/{store_id}", response_model=StoreResponse)
async def update_store(store_id: int, data: StoreUpdate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireAdmin):
    store = await db.get(Store, store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Magasin introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(store, field, value)
    await db.flush()
    await db.refresh(store)
    return store
