"""Default demo user per workflow role (APR-01 — assignee is a user, not only a role)."""

ROLE_DEFAULT_USER: dict[str, str] = {
    "SALES_MANAGER": "manager01",
    "LEGAL": "legal01",
    "ACCOUNTING": "account01",
    "DIRECTOR": "director01",
    "OPERATIONS": "ops01",
    "ADMIN": "admin01",
}


def resolve_assignee_user(role: str, submitted_by: str) -> str:
    if role == "SALES_STAFF":
        return submitted_by
    return ROLE_DEFAULT_USER.get(role, submitted_by)
