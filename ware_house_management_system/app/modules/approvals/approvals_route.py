from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission, require_any_permission
from app.models.access_control import User
from app.models.approval import ApprovalStatus, ApprovalOperationType
from app.modules.approvals.approvals_controller import ApprovalsController
from app.schemas.approval import (
    StockApprovalResponse,
    ApprovalActionRequest,
    PaginatedApprovalsResponse,
    ApprovalStatsResponse,
)
from app.schemas.inventory import StockInRequest, StockOutRequest, TransferRequest

router = APIRouter(tags=["Approvals"])


# ──────────────────────────────────────────────
# Submit a new Stock-In for approval
# ──────────────────────────────────────────────
@router.post(
    "/stock-in",
    response_model=StockApprovalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a Stock-In request for approval",
)
def submit_stock_in(
    data: StockInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stock-In does not commit directly.
    Creates a PENDING approval entry in the queue.
    Stock updates only after an authorized approver approves this request.
    """
    return ApprovalsController.submit_stock_in(data, current_user.id, db)


# ──────────────────────────────────────────────
# Submit a new Stock-Out for approval
# ──────────────────────────────────────────────
@router.post(
    "/stock-out",
    response_model=StockApprovalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a Stock-Out request for approval",
)
def submit_stock_out(
    data: StockOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stock-Out does not commit directly.
    Creates a PENDING approval entry in the queue.
    Stock deduction and movement logging occur only after an authorized approver approves this request.
    """
    return ApprovalsController.submit_stock_out(data, current_user.id, db)


# ──────────────────────────────────────────────
# Submit a new Transfer for approval
# ──────────────────────────────────────────────
@router.post(
    "/transfer",
    response_model=StockApprovalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a Warehouse Transfer request for approval",
)
def submit_transfer(
    data: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a Warehouse Transfer request and sends it to the approval queue.
    Upon approval, Stock Out is recorded at the Source Warehouse and Stock In is recorded at the Destination Warehouse.
    """
    return ApprovalsController.submit_transfer(data, current_user.id, db)


# ──────────────────────────────────────────────
# List all approvals (with optional filters)
# ──────────────────────────────────────────────
@router.get(
    "",
    response_model=PaginatedApprovalsResponse,
    summary="List approval requests",
)
def list_approvals(
    page: int = 1,
    page_size: int = 10,
    status: Optional[ApprovalStatus] = None,
    operation_type: Optional[ApprovalOperationType] = None,
    warehouse_id: Optional[int] = None,
    direction: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.access_control import User, Role
    from app.core.warehouse_access import is_admin_user
    from sqlalchemy.orm import joinedload

    user = (
        db.query(User)
        .options(joinedload(User.role).joinedload(Role.permissions), joinedload(User.warehouses))
        .filter(User.id == current_user.id)
        .first()
    )
    admin = is_admin_user(user)

    if not admin:
        assigned_wh_ids = [w.id for w in (user.warehouses or []) if w.status]
        if not assigned_wh_ids:
            return PaginatedApprovalsResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)

        user_perm_names = {p.name for p in (user.role.permissions if user and user.role else [])}
        has_general_read = "approval_read" in user_perm_names

        allowed_ops = []
        if has_general_read:
            allowed_ops = [ApprovalOperationType.STOCK_IN, ApprovalOperationType.STOCK_OUT, ApprovalOperationType.TRANSFER]
        else:
            if "stock_in_approve" in user_perm_names:
                allowed_ops.append(ApprovalOperationType.STOCK_IN)
            if "stock_out_approve" in user_perm_names:
                allowed_ops.append(ApprovalOperationType.STOCK_OUT)
            if "transfer_approve" in user_perm_names:
                allowed_ops.append(ApprovalOperationType.TRANSFER)

        if not allowed_ops:
            return PaginatedApprovalsResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)

        if warehouse_id is not None:
            if warehouse_id not in assigned_wh_ids:
                return PaginatedApprovalsResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
            target_wh_ids = [warehouse_id]
        else:
            target_wh_ids = assigned_wh_ids
    else:
        target_wh_ids = [warehouse_id] if warehouse_id is not None else None
        allowed_ops = None

    return ApprovalsController.list_approvals(
        db, page, page_size, status, operation_type, date_from, date_to, search, target_wh_ids, direction, allowed_ops
    )


# ──────────────────────────────────────────────
# Approve — requires stock_in_approve, stock_out_approve, or transfer_approve permission
# ──────────────────────────────────────────────
@router.post(
    "/{approval_id}/approve",
    response_model=StockApprovalResponse,
    summary="Approve a pending stock request",
)
def approve_approval(
    approval_id: int,
    action: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_permission("stock_in_approve", "stock_out_approve", "transfer_approve")),
):
    """
    User with `stock_in_approve`, `stock_out_approve`, or `transfer_approve` permission can approve.
    Executing approval generates the actual stock movements and updates inventory.
    """
    return ApprovalsController.approve(approval_id, action, current_user.id, db)


# ──────────────────────────────────────────────
# Reject — requires stock_in_approve, stock_out_approve, or transfer_approve permission
# ──────────────────────────────────────────────
@router.post(
    "/{approval_id}/reject",
    response_model=StockApprovalResponse,
    summary="Reject a pending stock request",
)
def reject_approval(
    approval_id: int,
    action: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_permission("stock_in_approve", "stock_out_approve", "transfer_approve")),
):
    """
    User with `stock_in_approve`, `stock_out_approve`, or `transfer_approve` permission can reject.
    Rejection cancels the request with no inventory changes.
    """
    return ApprovalsController.reject(approval_id, action, current_user.id, db)


# ──────────────────────────────────────────────
# Stats
# ──────────────────────────────────────────────
@router.get(
    "/stats",
    response_model=ApprovalStatsResponse,
    summary="Approval queue statistics",
)
def get_approval_stats(
    warehouse_id: Optional[int] = None,
    operation_type: Optional[ApprovalOperationType] = None,
    direction: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.access_control import User, Role
    from app.core.warehouse_access import is_admin_user
    from sqlalchemy.orm import joinedload

    user = (
        db.query(User)
        .options(joinedload(User.role).joinedload(Role.permissions), joinedload(User.warehouses))
        .filter(User.id == current_user.id)
        .first()
    )
    admin = is_admin_user(user)

    if not admin:
        assigned_wh_ids = [w.id for w in (user.warehouses or []) if w.status]
        if not assigned_wh_ids:
            return ApprovalStatsResponse(pending=0, approved=0, rejected=0, total=0)

        user_perm_names = {p.name for p in (user.role.permissions if user and user.role else [])}
        has_general_read = "approval_read" in user_perm_names

        allowed_ops = []
        if has_general_read:
            allowed_ops = [ApprovalOperationType.STOCK_IN, ApprovalOperationType.STOCK_OUT, ApprovalOperationType.TRANSFER]
        else:
            if "stock_in_approve" in user_perm_names:
                allowed_ops.append(ApprovalOperationType.STOCK_IN)
            if "stock_out_approve" in user_perm_names:
                allowed_ops.append(ApprovalOperationType.STOCK_OUT)
            if "transfer_approve" in user_perm_names:
                allowed_ops.append(ApprovalOperationType.TRANSFER)

        if not allowed_ops:
            return ApprovalStatsResponse(pending=0, approved=0, rejected=0, total=0)

        if warehouse_id is not None:
            if warehouse_id not in assigned_wh_ids:
                return ApprovalStatsResponse(pending=0, approved=0, rejected=0, total=0)
            target_wh_ids = [warehouse_id]
        else:
            target_wh_ids = assigned_wh_ids
    else:
        target_wh_ids = [warehouse_id] if warehouse_id is not None else None
        allowed_ops = None

    return ApprovalsController.get_stats(db, target_wh_ids, operation_type, direction, allowed_ops)
