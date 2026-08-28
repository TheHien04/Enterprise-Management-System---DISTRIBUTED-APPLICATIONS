from fastapi import APIRouter

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("")
async def list_customers():
    """TODO: implement UC-01 list customers."""
    return {"success": True, "data": [], "message": "Scaffold ready"}


@router.post("")
async def create_customer():
    """TODO: implement UC-01 create customer."""
    return {"success": True, "data": None, "message": "Scaffold ready"}
