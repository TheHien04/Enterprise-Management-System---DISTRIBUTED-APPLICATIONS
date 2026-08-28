from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from udpt_common.auth import create_access_token

router = APIRouter()

# Demo users — replace with DB lookup in production
DEMO_USERS = {
    "sale01": {"password": "sale01", "roles": ["SALES_STAFF"], "name": "Sales Staff 01"},
    "manager01": {"password": "manager01", "roles": ["SALES_MANAGER"], "name": "Sales Manager 01"},
    "legal01": {"password": "legal01", "roles": ["LEGAL"], "name": "Legal 01"},
    "account01": {"password": "account01", "roles": ["ACCOUNTING"], "name": "Accountant 01"},
    "director01": {"password": "director01", "roles": ["DIRECTOR"], "name": "Director 01"},
    "ops01": {"password": "ops01", "roles": ["OPERATIONS"], "name": "Operations Staff 01"},
    "admin01": {"password": "admin01", "roles": ["ADMIN"], "name": "System Admin"},
}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    roles: list[str]
    full_name: str


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = DEMO_USERS.get(payload.username)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(
        subject=payload.username,
        roles=user["roles"],
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return LoginResponse(
        access_token=token,
        username=payload.username,
        roles=user["roles"],
        full_name=user["name"],
    )
