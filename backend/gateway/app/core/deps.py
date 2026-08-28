from typing import Annotated

from fastapi import Header, HTTPException
from udpt_common.auth import decode_access_token

from app.core.config import settings


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return decode_access_token(token, secret=settings.jwt_secret, algorithm=settings.jwt_algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
