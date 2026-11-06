from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.core.dependencies import get_current_user
from app.models.access_control import User
from app.core.s3 import upload_file_to_s3

router = APIRouter(prefix="/uploads", tags=["Uploads"])


class FileUploadResponse(BaseModel):
    file_url: str
    file_name: str
    file_size: int
    content_type: str
    s3_key: str


@router.post("", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
@router.post("/s3", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_or_image(
    file: UploadFile = File(...),
    folder: Optional[str] = Form("attachments"),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an optional image or document to AWS S3.
    Supports images (png, jpg, jpeg, webp, gif) and documents (pdf, doc, docx, xls, xlsx, csv, txt).
    Max file size: 25 MB.
    """
    MAX_SIZE = 25 * 1024 * 1024  # 25 MB
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed limit of 25 MB.",
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload an empty file.",
        )

    # Allowed extensions
    allowed_exts = {
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"
    }
    filename = file.filename or "upload"
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext and ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed types: images (png, jpg, webp) and documents (pdf, doc, xls, csv, txt).",
        )

    try:
        result = upload_file_to_s3(
            file_bytes=contents,
            filename=filename,
            content_type=file.content_type,
            folder=folder or "attachments",
        )
        return FileUploadResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to S3: {str(e)}",
        )

