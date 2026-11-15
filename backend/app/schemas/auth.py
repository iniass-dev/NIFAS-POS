from pydantic import BaseModel
from app.models.user import UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    role: UserRole


class LoginRequest(BaseModel):
    email: str
    password: str


class PinLoginRequest(BaseModel):
    register_id: int
    pin: str
