from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey, DateTime, Enum, Date, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ClaimStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REPLACED = "replaced"
    RESOLVED = "resolved"


class ServiceStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SerializedWarrantyClaim(Base):
    __tablename__ = "serialized_warranty_claims"

    id = Column(Integer, primary_key=True, index=True)
    product_item_id = Column(Integer, ForeignKey("serialized_items.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    claim_date = Column(Date, nullable=False, server_default=func.current_date())
    issue_description = Column(Text, nullable=False)
    status = Column(Enum(ClaimStatus, name="claim_status_enum"), default=ClaimStatus.PENDING)
    resolution = Column(Text, nullable=True)
    replaced_with_item_id = Column(Integer, ForeignKey("serialized_items.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    product_item = relationship("SerializedItem", foreign_keys=[product_item_id], back_populates="warranty_claims")
    replaced_with_item = relationship("SerializedItem", foreign_keys=[replaced_with_item_id])
    customer = relationship("Customer")
    service_records = relationship("SerializedServiceRecord", back_populates="warranty_claim")


class SerializedServiceRecord(Base):
    __tablename__ = "serialized_service_records"

    id = Column(Integer, primary_key=True, index=True)
    product_item_id = Column(Integer, ForeignKey("serialized_items.id", ondelete="CASCADE"), nullable=False, index=True)
    warranty_claim_id = Column(Integer, ForeignKey("serialized_warranty_claims.id", ondelete="SET NULL"), nullable=True, index=True)
    service_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    cost = Column(Numeric(12, 2), default=0.00)
    status = Column(Enum(ServiceStatus, name="service_status_enum"), default=ServiceStatus.PENDING)
    serviced_by = Column(String(100), nullable=True)
    service_date = Column(Date, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    product_item = relationship("SerializedItem", back_populates="service_records")
    warranty_claim = relationship("SerializedWarrantyClaim", back_populates="service_records")


class BulkStockLog(Base):
    __tablename__ = "bulk_stock_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    log_type = Column(String(30), nullable=False)
    quantity = Column(Integer, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    note = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product")
    variant = relationship("ProductVariant")
    warehouse = relationship("Warehouse")
    customer = relationship("Customer")


class ServiceTicketStatus(str, enum.Enum):
    IDLE = "idle"
    ON_REPAIRING = "on_repairing"
    WORK_FINISH = "work_finish"
    DELIVERED = "delivered"


class ServiceTicket(Base):
    __tablename__ = "service_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    barcode = Column(String(100), nullable=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name = Column(String(150), nullable=False)
    item_name = Column(String(150), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String(150), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    customer_address = Column(Text, nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    issue_description = Column(Text, nullable=False)
    estimated_time = Column(String(100), nullable=True)
    estimated_completion_date = Column(Date, nullable=True)
    status = Column(Enum(ServiceTicketStatus, name="service_ticket_status_enum"), default=ServiceTicketStatus.IDLE, nullable=False, index=True)
    repair_notes = Column(Text, nullable=True)
    cost = Column(Numeric(12, 2), default=0.00)
    received_date = Column(Date, nullable=False, server_default=func.current_date())
    started_at = Column(DateTime, nullable=True)
    started_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    completed_date = Column(DateTime, nullable=True)
    completed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    delivered_date = Column(DateTime, nullable=True)
    delivered_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    attachment_url = Column(Text, nullable=True)
    delivery_attachment_url = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    product = relationship("Product")
    variant = relationship("ProductVariant")
    customer = relationship("Customer")
    warehouse = relationship("Warehouse", foreign_keys=[warehouse_id])
    creator = relationship("User", foreign_keys=[created_by])
    started_by_user = relationship("User", foreign_keys=[started_by])
    completed_by_user = relationship("User", foreign_keys=[completed_by])
    delivered_by_user = relationship("User", foreign_keys=[delivered_by])
