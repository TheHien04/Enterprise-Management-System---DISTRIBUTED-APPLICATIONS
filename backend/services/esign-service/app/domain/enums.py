from enum import StrEnum


class SigningStatus(StrEnum):
    PENDING_SEND = "PENDING_SEND"
    SIGNING = "SIGNING"
    SIGNED = "SIGNED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
