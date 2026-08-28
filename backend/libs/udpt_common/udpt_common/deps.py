from dataclasses import dataclass
from typing import Annotated

from fastapi import Header


@dataclass
class RequestUser:
    user_id: str
    roles: list[str]

    def has_role(self, role: str) -> bool:
        return role in self.roles or "ADMIN" in self.roles


def get_request_user(
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_roles: Annotated[str | None, Header()] = None,
) -> RequestUser:
    roles = [r.strip() for r in (x_user_roles or "").split(",") if r.strip()]
    return RequestUser(user_id=x_user_id or "system", roles=roles)
