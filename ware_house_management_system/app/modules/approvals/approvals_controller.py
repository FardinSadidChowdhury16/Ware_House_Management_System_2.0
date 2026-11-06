from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session

from app.models.approval import ApprovalStatus, ApprovalOperationType
from app.modules.approvals.approvals_service import ApprovalsService
from app.schemas.inventory import StockInRequest, StockOutRequest, TransferRequest
from app.schemas.approval import ApprovalActionRequest


class ApprovalsController:

    @staticmethod
    def submit_stock_in(data: StockInRequest, user_id: int, db: Session):
        service = ApprovalsService(db)
        return service.submit_stock_in(data, user_id)

    @staticmethod
    def submit_stock_out(data: StockOutRequest, user_id: int, db: Session):
        service = ApprovalsService(db)
        return service.submit_stock_out(data, user_id)

    @staticmethod
    def submit_transfer(data: TransferRequest, user_id: int, db: Session):
        service = ApprovalsService(db)
        return service.submit_transfer(data, user_id)

    @staticmethod
    def list_approvals(
        db: Session,
        page: int,
        page_size: int,
        status: Optional[ApprovalStatus],
        operation_type: Optional[ApprovalOperationType],
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        search: Optional[str] = None,
        target_wh_ids: Optional[List[int]] = None,
        direction: Optional[str] = None,
        allowed_op_types: Optional[List[ApprovalOperationType]] = None,
    ):
        service = ApprovalsService(db)
        return service.list_approvals(page, page_size, status, operation_type, date_from, date_to, search, target_wh_ids, direction, allowed_op_types)

    @staticmethod
    def approve(approval_id: int, action: ApprovalActionRequest, reviewer_id: int, db: Session):
        service = ApprovalsService(db)
        return service.approve(approval_id, reviewer_id, action.note)

    @staticmethod
    def reject(approval_id: int, action: ApprovalActionRequest, reviewer_id: int, db: Session):
        service = ApprovalsService(db)
        return service.reject(approval_id, reviewer_id, action.note)

    @staticmethod
    def get_stats(
        db: Session,
        target_wh_ids: Optional[List[int]] = None,
        operation_type: Optional[ApprovalOperationType] = None,
        direction: Optional[str] = None,
        allowed_op_types: Optional[List[ApprovalOperationType]] = None,
    ):
        service = ApprovalsService(db)
        return service.get_stats(target_wh_ids, operation_type, direction, allowed_op_types)
