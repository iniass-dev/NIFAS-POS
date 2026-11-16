from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.payment_method import PaymentMethod, PaymentType
from app.models.register import Register, RegisterPaymentMethod
from app.models.store import Store
from app.utils.security import RequireAdmin, RequireManager

router = APIRouter(prefix="/registers", tags=["registers"])


class RegisterCreate(BaseModel):
    name: str
    description: str | None = None
    store_id: int | None = None
    payment_method_ids: list[int] = []


class PaymentMethodCreate(BaseModel):
    name: str
    type: PaymentType
    sequence: int = 10


class RegisterResponse(BaseModel):
    id: int
    name: str
    description: str | None
    store_id: int | None
    active: bool

    model_config = {"from_attributes": True}


class RegisterPublicResponse(BaseModel):
    id: int
    name: str
    store_name: str | None
    store_address: str | None = None
    store_city: str | None = None
    store_phone: str | None = None
    store_tax_included: bool = True

    model_config = {"from_attributes": True}


class PaymentMethodResponse(BaseModel):
    id: int
    name: str
    type: PaymentType
    logo: str | None = None
    active: bool
    sequence: int

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[RegisterResponse])
async def list_registers(db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    result = await db.execute(select(Register).where(Register.active == True))
    return result.scalars().all()


@router.get("/by-store/{store_id}", response_model=list[RegisterResponse])
async def registers_by_store(store_id: int, db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    result = await db.execute(select(Register).where(Register.store_id == store_id, Register.active == True))
    return result.scalars().all()


@router.post("/", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def create_register(data: RegisterCreate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireAdmin):
    register = Register(name=data.name, description=data.description, store_id=data.store_id)
    db.add(register)
    await db.flush()
    for pm_id in data.payment_method_ids:
        db.add(RegisterPaymentMethod(register_id=register.id, payment_method_id=pm_id))
    await db.flush()
    await db.refresh(register)
    return register


@router.get("/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(db: Annotated[AsyncSession, Depends(get_db)], _=RequireManager):
    result = await db.execute(select(PaymentMethod).where(PaymentMethod.active == True).order_by(PaymentMethod.sequence))
    return result.scalars().all()


@router.post("/payment-methods", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_method(data: PaymentMethodCreate, db: Annotated[AsyncSession, Depends(get_db)], _=RequireAdmin):
    pm = PaymentMethod(**data.model_dump())
    db.add(pm)
    await db.flush()
    await db.refresh(pm)
    return pm


def _store_dict(r: Register, store: Store | None) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "store_name": store.name if store else None,
        "store_address": store.address if store else None,
        "store_city": store.city if store else None,
        "store_phone": store.phone if store else None,
        "store_tax_included": store.tax_included if store else True,
    }


@router.get("/public", response_model=list[RegisterPublicResponse])
async def list_registers_public(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Register, Store)
        .outerjoin(Store, Register.store_id == Store.id)
        .where(Register.active == True)
        .order_by(Register.id)
    )
    return [_store_dict(r, s) for r, s in result.all()]


@router.get("/{register_id}", response_model=RegisterPublicResponse)
async def get_register(register_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Register, Store)
        .outerjoin(Store, Register.store_id == Store.id)
        .where(Register.id == register_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Caisse introuvable")
    return _store_dict(row[0], row[1])


@router.get("/{register_id}/payment-methods", response_model=list[PaymentMethodResponse])
async def register_payment_methods(register_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(PaymentMethod)
        .join(RegisterPaymentMethod, PaymentMethod.id == RegisterPaymentMethod.payment_method_id)
        .where(RegisterPaymentMethod.register_id == register_id, PaymentMethod.active == True)
        .order_by(PaymentMethod.sequence)
    )
    return result.scalars().all()


class RegisterPaymentMethodsUpdate(BaseModel):
    payment_method_ids: list[int]


@router.put("/{register_id}/payment-methods", response_model=list[PaymentMethodResponse])
async def update_register_payment_methods(
    register_id: int,
    data: RegisterPaymentMethodsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _=RequireAdmin,
):
    register = await db.get(Register, register_id)
    if not register:
        raise HTTPException(status_code=404, detail="Caisse introuvable")
    await db.execute(
        RegisterPaymentMethod.__table__.delete().where(RegisterPaymentMethod.register_id == register_id)
    )
    for pm_id in data.payment_method_ids:
        db.add(RegisterPaymentMethod(register_id=register_id, payment_method_id=pm_id))
    await db.flush()
    result = await db.execute(
        select(PaymentMethod)
        .join(RegisterPaymentMethod, PaymentMethod.id == RegisterPaymentMethod.payment_method_id)
        .where(RegisterPaymentMethod.register_id == register_id, PaymentMethod.active == True)
        .order_by(PaymentMethod.sequence)
    )
    return result.scalars().all()
