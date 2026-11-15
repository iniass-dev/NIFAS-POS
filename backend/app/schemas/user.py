from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    pin: str | None = None
    role: UserRole = UserRole.cashier


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    pin: str | None = None
    role: UserRole | None = None
    active: bool | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
