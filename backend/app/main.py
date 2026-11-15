import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models.payment_method import PaymentMethod, PaymentType
from app.routers import auth, users, products, stock, sessions, orders, dashboard, registers, stores

DEFAULT_PAYMENT_METHODS = [
    {"name": "Espèces",      "type": PaymentType.cash,  "logo": "/logos/especes.png", "sequence": 10},
    {"name": "Wave",         "type": PaymentType.other, "logo": "/logos/wave.png",    "sequence": 20},
    {"name": "Orange Money", "type": PaymentType.other, "logo": "/logos/om.png",      "sequence": 30},
]


async def seed_payment_methods():
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(PaymentMethod))).scalars().all()
        if not existing:
            for pm in DEFAULT_PAYMENT_METHODS:
                db.add(PaymentMethod(**pm))
            await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_payment_methods()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print("=== 500 TRACEBACK ===\n", tb)
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}", "tb": tb})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(stock.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(registers.router, prefix="/api")
app.include_router(stores.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.app_version}
