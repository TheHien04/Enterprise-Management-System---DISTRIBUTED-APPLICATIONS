import httpx
import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from udpt_common.config_loader import load_json_config

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


@router.get("/roles")
async def list_roles(user: dict = Depends(get_current_user)):
    roles = user.get("roles", [])
    if "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    unique_roles = sorted({role for info in DEMO_USERS.values() for role in info["roles"]})
    return {"success": True, "data": unique_roles}


@router.get("/workflow-templates")
async def list_workflow_templates(user: dict = Depends(get_current_user)):
    roles = user.get("roles", [])
    if "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    templates = load_json_config("workflow_definitions.json")
    return {"success": True, "data": templates}


@router.get("/state-machines")
async def list_state_machines(user: dict = Depends(get_current_user)):
    roles = user.get("roles", [])
    if "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    machines = load_json_config("state_machines.json")
    return {"success": True, "data": machines}
