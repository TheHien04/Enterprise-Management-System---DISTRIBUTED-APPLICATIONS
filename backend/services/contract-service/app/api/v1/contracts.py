from fastapi import APIRouter

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.get("")
async def list_contracts():
    """TODO: implement UC-02 list contracts."""
    return {"success": True, "data": [], "message": "Scaffold ready"}
