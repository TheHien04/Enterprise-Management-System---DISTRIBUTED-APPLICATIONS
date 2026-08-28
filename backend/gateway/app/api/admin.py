from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import DEMO_USERS
from app.core.config import settings
from app.core.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    roles = user.get("roles", [])
    if "ADMIN" not in roles and "DIRECTOR" not in roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    return {
        "success": True,
        "data": [
            {
                "username": username,
                "full_name": info["name"],
                "roles": info["roles"],
            }
            for username, info in DEMO_USERS.items()
        ],
    }
