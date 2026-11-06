from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from app.models.service import ClaimStatus, ServiceStatus, ServiceTicketStatus


# Warranty Claim Schemas
class WarrantyClaimCreate(BaseModel):
    product_item_id: int
    customer_id: Optional[int] = None
    issue_description: str


class WarrantyClaimUpdate(BaseModel):
    status: Optional[ClaimStatus] = None
    resolution: Optional[str] = None
    replaced_with_item_id: Optional[int] = None


class WarrantyClaimResponse(WarrantyClaimCreate):
    id: int
    claim_date: date
    status: ClaimStatus
    resolution: Optional[str] = None
    replaced_with_item_id: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Service Record Schemas
class ServiceRecordCreate(BaseModel):
    product_item_id: int
    warranty_claim_id: Optional[int] = None
    service_type: str
    description: Optional[str] = None
    cost: float = 0.00
    serviced_by: Optional[str] = None
    service_date: Optional[date] = None


class ServiceRecordResponse(ServiceRecordCreate):
    id: int
    status: ServiceStatus
    created_at: datetime

    class Config:
        from_attributes = True


# Product Item Warranty Schemas
class ProductWarrantyItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    item: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    remain_days: Optional[int] = None
    status: str  # "active", "expiring_soon", "expired", "no_warranty"
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True


class WarrantyStatsResponse(BaseModel):
    total: int
    active: int
    expired: int
    no_warranty: int


class PaginatedProductWarrantyResponse(BaseModel):
    items: List[ProductWarrantyItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: WarrantyStatsResponse


# Service Ticket Schemas
class ServiceTicketCreate(BaseModel):
    barcode: Optional[str] = None
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    product_name: str
    item_name: Optional[str] = None
    warehouse_id: Optional[int] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    issue_description: str
    estimated_time: Optional[str] = None
    estimated_completion_date: Optional[date] = None
    status: Optional[ServiceTicketStatus] = ServiceTicketStatus.IDLE
    repair_notes: Optional[str] = None
    cost: Optional[float] = 0.00
    attachment_url: Optional[str] = None
    delivery_attachment_url: Optional[str] = None


class ServiceTicketUpdate(BaseModel):
    status: Optional[ServiceTicketStatus] = None
    warehouse_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    issue_description: Optional[str] = None
    estimated_time: Optional[str] = None
    estimated_completion_date: Optional[date] = None
    repair_notes: Optional[str] = None
    cost: Optional[float] = None
    attachment_url: Optional[str] = None
    delivery_attachment_url: Optional[str] = None


class ServiceTicketResponse(BaseModel):
    id: int
    ticket_number: str
    barcode: Optional[str] = None
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    product_name: str
    item_name: Optional[str] = None
    warehouse_id: Optional[int] = None
    warehouse_name: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    issue_description: str
    estimated_time: Optional[str] = None
    estimated_completion_date: Optional[date] = None
    status: ServiceTicketStatus
    repair_notes: Optional[str] = None
    cost: float
    received_date: date
    started_at: Optional[datetime] = None
    started_by: Optional[int] = None
    started_by_name: Optional[str] = None
    completed_date: Optional[datetime] = None
    completed_by: Optional[int] = None
    completed_by_name: Optional[str] = None
    delivered_date: Optional[datetime] = None
    delivered_by: Optional[int] = None
    delivered_by_name: Optional[str] = None
    attachment_url: Optional[str] = None
    delivery_attachment_url: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ServiceTicketStatsResponse(BaseModel):
    total: int
    idle: int
    on_repairing: int
    work_finish: int
    delivered: int


class PaginatedServiceTicketsResponse(BaseModel):
    items: List[ServiceTicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: ServiceTicketStatsResponse


class BarcodeLookupResponse(BaseModel):
    found: bool
    barcode: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    variant_id: Optional[int] = None
    item_name: Optional[str] = None
    sku: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None

