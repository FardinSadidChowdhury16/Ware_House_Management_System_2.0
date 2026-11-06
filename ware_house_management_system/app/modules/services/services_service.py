from typing import List, Optional, Union
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.modules.services.services_repository import ServicesRepository
from app.schemas.service import (
    WarrantyClaimCreate,
    WarrantyClaimUpdate,
    WarrantyClaimResponse,
    ServiceRecordCreate,
    ServiceRecordResponse,
    ServiceTicketCreate,
    ServiceTicketUpdate,
    ServiceTicketResponse,
    PaginatedServiceTicketsResponse,
    BarcodeLookupResponse,
)


class ServicesService:
    def __init__(self, db: Session):
        self.repo = ServicesRepository(db)

    def file_warranty_claim(self, claim_in: WarrantyClaimCreate) -> WarrantyClaimResponse:
        return self.repo.create_claim(claim_in)

    def process_claim_update(self, claim_id: int, claim_in: WarrantyClaimUpdate) -> WarrantyClaimResponse:
        claim = self.repo.get_claim_by_id(claim_id)
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warranty claim with ID {claim_id} not found",
            )
        return self.repo.update_claim(claim, claim_in)

    def fetch_all_claims(self) -> List[WarrantyClaimResponse]:
        return self.repo.get_all_claims()

    def add_service_record(self, record_in: ServiceRecordCreate) -> ServiceRecordResponse:
        return self.repo.create_record(record_in)

    def fetch_all_records(self) -> List[ServiceRecordResponse]:
        return self.repo.get_all_records()

    def fetch_warranties_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        status: str = None,
        expire_from = None,
        expire_to = None,
        warehouse_id: Optional[Union[int, List[int]]] = None,
    ):
        return self.repo.get_warranties_paginated(page, page_size, search, status, expire_from, expire_to, warehouse_id)

    def create_service_ticket(self, ticket_in: ServiceTicketCreate, user_id: int = None) -> ServiceTicketResponse:
        return self.repo.create_ticket(ticket_in, user_id)

    def update_service_ticket(self, ticket_id: int, ticket_in: ServiceTicketUpdate, user_id: int = None) -> ServiceTicketResponse:
        raw_ticket = self.repo.get_ticket_raw(ticket_id)
        if not raw_ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service ticket with ID {ticket_id} not found",
            )
        return self.repo.update_ticket(raw_ticket, ticket_in, user_id)

    def get_service_ticket(self, ticket_id: int) -> ServiceTicketResponse:
        ticket = self.repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service ticket with ID {ticket_id} not found",
            )
        return ticket

    def delete_service_ticket(self, ticket_id: int):
        raw_ticket = self.repo.get_ticket_raw(ticket_id)
        if not raw_ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service ticket with ID {ticket_id} not found",
            )
        return self.repo.delete_ticket(raw_ticket)

    def list_service_tickets(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        status: str = None,
        warehouse_id: Optional[Union[int, List[int]]] = None,
    ) -> PaginatedServiceTicketsResponse:
        return self.repo.get_tickets_paginated(page, page_size, search, status, warehouse_id)

    def lookup_barcode(self, barcode: str) -> BarcodeLookupResponse:
        return self.repo.barcode_lookup(barcode)
