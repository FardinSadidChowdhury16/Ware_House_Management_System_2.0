from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict
from app.models.approval import ApprovalOperationType, ApprovalStatus


class StockApprovalCreate(BaseModel):
    """Internal schema — used when creating a pending approval from stock-in endpoint."""
    operation_type: ApprovalOperationType
    payload: Dict[str, Any]
    warehouse_id: Optional[int] = None
    supplier_id: Optional[int] = None


class ApprovalActionRequest(BaseModel):
    """Approve or Reject a pending approval — optionally include a note."""
    note: Optional[str] = None


class StockApprovalResponse(BaseModel):
    id: int
    operation_type: ApprovalOperationType
    status: ApprovalStatus
    payload: Dict[str, Any]
    warehouse_id: Optional[int] = None
    warehouse_name: Optional[str] = None
    to_warehouse_id: Optional[int] = None
    to_warehouse_name: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    requested_by: Optional[int] = None
    requested_by_name: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    review_note: Optional[str] = None
    attachment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedApprovalsResponse(BaseModel):
    items: List[StockApprovalResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ApprovalStatsResponse(BaseModel):
    pending: int
    approved: int
    rejected: int
    total: int
