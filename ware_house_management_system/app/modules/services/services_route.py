from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.core.warehouse_access import resolve_warehouse_scope, is_admin_user
from app.models.access_control import User
from app.modules.services.services_controller import ServicesController
from app.schemas.service import (
    WarrantyClaimCreate,
    WarrantyClaimUpdate,
    WarrantyClaimResponse,
    ServiceRecordCreate,
    ServiceRecordResponse,
    PaginatedProductWarrantyResponse,
    ServiceTicketCreate,
    ServiceTicketUpdate,
    ServiceTicketResponse,
    PaginatedServiceTicketsResponse,
    BarcodeLookupResponse,
)

router = APIRouter(tags=["Services & Warranty"])


@router.get("/warranties", response_model=PaginatedProductWarrantyResponse, summary="List product item warranties with remaining days")
def list_product_warranties(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    expire_from: Optional[date] = None,
    expire_to: Optional[date] = None,
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed, target_ids = resolve_warehouse_scope(db, current_user, requested_warehouse_id=warehouse_id)
    if not allowed:
        return PaginatedProductWarrantyResponse(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
            total_pages=0,
            stats={"total": 0, "active": 0, "expired": 0, "no_warranty": 0},
        )
    effective_warehouse_id = target_ids if target_ids is not None else warehouse_id
    return ServicesController.get_warranties(db, page, page_size, search, status, expire_from, expire_to, effective_warehouse_id)


@router.post("/claims", response_model=WarrantyClaimResponse, status_code=status.HTTP_201_CREATED)
def create_warranty_claim(
    claim_in: WarrantyClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.create_claim(claim_in, db)


@router.patch("/claims/{claim_id}", response_model=WarrantyClaimResponse)
def update_warranty_claim(
    claim_id: int,
    claim_in: WarrantyClaimUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.update_claim(claim_id, claim_in, db)


@router.get("/claims", response_model=List[WarrantyClaimResponse])
def list_warranty_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.get_claims(db)


@router.post("/records", response_model=ServiceRecordResponse, status_code=status.HTTP_201_CREATED)
def create_service_record(
    record_in: ServiceRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.create_record(record_in, db)


@router.get("/records", response_model=List[ServiceRecordResponse])
def list_service_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.get_records(db)


@router.get("/tickets", response_model=PaginatedServiceTicketsResponse, summary="List service tickets with pagination and stats")
def list_service_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed, target_ids = resolve_warehouse_scope(db, current_user, requested_warehouse_id=warehouse_id)
    if not allowed:
        return PaginatedServiceTicketsResponse(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
            total_pages=0,
            stats={"total": 0, "idle": 0, "on_repairing": 0, "work_finish": 0, "delivered": 0},
        )
    effective_warehouse_id = target_ids if target_ids is not None else warehouse_id
    return ServicesController.get_tickets(db, page, page_size, search, status, effective_warehouse_id)


@router.post("/tickets", response_model=ServiceTicketResponse, status_code=status.HTTP_201_CREATED, summary="Create a new service ticket")
def create_service_ticket(
    ticket_in: ServiceTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.create_ticket(ticket_in, db, user_id=current_user.id if current_user else None)


@router.get("/tickets/{ticket_id}", response_model=ServiceTicketResponse, summary="Get service ticket by ID")
def get_service_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.get_ticket(ticket_id, db)


@router.patch("/tickets/{ticket_id}", response_model=ServiceTicketResponse, summary="Update service ticket")
def update_service_ticket(
    ticket_id: int,
    ticket_in: ServiceTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.update_ticket(ticket_id, ticket_in, db, user_id=current_user.id if current_user else None)


@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete service ticket")
def delete_service_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Access denied: Administrator privileges required.")
    ServicesController.delete_ticket(ticket_id, db)
    return None


@router.get("/barcode-lookup", response_model=BarcodeLookupResponse, summary="Lookup product and customer details by barcode")
def lookup_barcode(
    barcode: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ServicesController.lookup_barcode(barcode, db)
