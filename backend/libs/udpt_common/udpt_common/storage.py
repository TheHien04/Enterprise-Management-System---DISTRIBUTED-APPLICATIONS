import io
import uuid
from functools import lru_cache

from minio import Minio
from minio.error import S3Error


@lru_cache
def get_minio_client(
    endpoint: str,
    access_key: str,
    secret_key: str,
    secure: bool = False,
) -> Minio:
    return Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)


def ensure_bucket(client: Minio, bucket: str) -> None:
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def upload_bytes(
    *,
    endpoint: str,
    access_key: str,
    secret_key: str,
    bucket: str,
    object_name: str,
    data: bytes,
    content_type: str = "application/octet-stream",
    secure: bool = False,
) -> str:
    client = get_minio_client(endpoint, access_key, secret_key, secure)
    ensure_bucket(client, bucket)
    client.put_object(bucket, object_name, io.BytesIO(data), length=len(data), content_type=content_type)
    return f"minio://{bucket}/{object_name}"


def upload_demo_file(
    *,
    endpoint: str,
    access_key: str,
    secret_key: str,
    bucket: str,
    prefix: str,
    file_name: str,
    data: bytes | None = None,
    secure: bool = False,
) -> str:
    payload = data or b"%PDF-1.4 demo attachment"
    object_name = f"{prefix}/{uuid.uuid4().hex}_{file_name}"
    return upload_bytes(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        bucket=bucket,
        object_name=object_name,
        data=payload,
        content_type="application/pdf" if file_name.endswith(".pdf") else "application/octet-stream",
        secure=secure,
    )
