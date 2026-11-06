import re
import uuid
import mimetypes
from typing import Optional, Dict, Any

try:
    import boto3  # type: ignore
    from botocore.exceptions import ClientError  # type: ignore
except ImportError:
    boto3 = None  # type: ignore
    class ClientError(Exception):  # type: ignore
        pass

from app.core.config import settings


def get_s3_client():
    if boto3 is None:
        raise RuntimeError("boto3 is not installed. Please install boto3 with 'pip install boto3'")
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def sanitize_filename(filename: str) -> str:
    # Remove paths, keep alphanumeric, dots, underscores, dashes
    clean = re.sub(r"[^\w.\-]", "_", filename.strip())
    return clean or "document"


def upload_file_to_s3(
    file_bytes: bytes,
    filename: str,
    content_type: Optional[str] = None,
    folder: str = "attachments",
) -> Dict[str, Any]:
    """
    Uploads bytes to AWS S3 bucket and returns a dictionary with url, key, filename, size, content_type.
    """
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        raise ValueError("AWS credentials are not configured in settings.")

    s3 = get_s3_client()
    clean_name = sanitize_filename(filename)
    unique_prefix = uuid.uuid4().hex[:12]
    s3_key = f"{folder.strip('/')}/{unique_prefix}_{clean_name}"

    if not content_type:
        content_type, _ = mimetypes.guess_type(clean_name)
        if not content_type:
            content_type = "application/octet-stream"

    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=s3_key,
        Body=file_bytes,
        ContentType=content_type,
    )

    region_part = f".{settings.AWS_REGION}" if settings.AWS_REGION else ""
    file_url = f"https://{settings.AWS_S3_BUCKET_NAME}.s3{region_part}.amazonaws.com/{s3_key}"

    return {
        "file_url": file_url,
        "s3_key": s3_key,
        "file_name": clean_name,
        "content_type": content_type,
        "file_size": len(file_bytes),
    }


def delete_file_from_s3(s3_key: str) -> bool:
    try:
        s3 = get_s3_client()
        s3.delete_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=s3_key)
        return True
    except (ClientError, Exception):
        return False


class S3Service:
    """Class wrapper for S3 utility functions."""
    @staticmethod
    def get_client():
        return get_s3_client()

    @staticmethod
    def upload_file(
        file_bytes: bytes,
        filename: str,
        content_type: Optional[str] = None,
        folder: str = "attachments",
    ) -> Dict[str, Any]:
        return upload_file_to_s3(file_bytes, filename, content_type, folder)

    @staticmethod
    def delete_file(s3_key: str) -> bool:
        return delete_file_from_s3(s3_key)

    @staticmethod
    def sanitize(filename: str) -> str:
        return sanitize_filename(filename)
