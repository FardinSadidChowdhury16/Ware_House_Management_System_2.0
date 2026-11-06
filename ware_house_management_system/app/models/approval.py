from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ApprovalOperationType(str, enum.Enum):
    STOCK_IN = "stock_in"
    STOCK_OUT = "stock_out"
    TRANSFER = "transfer"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class StockApproval(Base):
    __tablename__ = "stock_approvals"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(
        Enum(ApprovalOperationType, name="approval_operation_type"),
        nullable=False,
        index=True,
    )
    status = Column(
        Enum(ApprovalStatus, name="approval_status"),
        default=ApprovalStatus.PENDING,
        nullable=False,
        index=True,
    )
    # Original request payload (StockInRequest JSON)
    payload = Column(JSONB, nullable=False)

    # Quick-access denormalized fields for filtering/display
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True)

    # Who submitted this request
    requested_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # Who reviewed (approved/rejected)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_note = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    warehouse = relationship("Warehouse", foreign_keys=[warehouse_id])
    supplier = relationship("Supplier", foreign_keys=[supplier_id])
    requester = relationship("User", foreign_keys=[requested_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
