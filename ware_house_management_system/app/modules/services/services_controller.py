from typing import List, Optional, Union
from sqlalchemy.orm import Session
from app.modules.services.services_service import ServicesService
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


class ServicesController:
    @staticmethod
    def create_claim(claim_in: WarrantyClaimCreate, db: Session) -> WarrantyClaimResponse:
        service = ServicesService(db)
        return service.file_warranty_claim(claim_in)

    @staticmethod
    def update_claim(
        claim_id: int, claim_in: WarrantyClaimUpdate, db: Session
    ) -> WarrantyClaimResponse:
        service = ServicesService(db)
        return service.process_claim_update(claim_id, claim_in)

    @staticmethod
    def get_claims(db: Session) -> List[WarrantyClaimResponse]:
        service = ServicesService(db)
        return service.fetch_all_claims()

    @staticmethod
    def create_record(record_in: ServiceRecordCreate, db: Session) -> ServiceRecordResponse:
        service = ServicesService(db)
        return service.add_service_record(record_in)

    @staticmethod
    def get_records(db: Session) -> List[ServiceRecordResponse]:
        service = ServicesService(db)
        return service.fetch_all_records()

    @staticmethod
    def get_warranties(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        status: str = None,
        expire_from = None,
        expire_to = None,
        warehouse_id: Optional[Union[int, List[int]]] = None,
    ):
        service = ServicesService(db)
        return service.fetch_warranties_paginated(page, page_size, search, status, expire_from, expire_to, warehouse_id)

    @staticmethod
    def create_ticket(ticket_in: ServiceTicketCreate, db: Session, user_id: int = None) -> ServiceTicketResponse:
        service = ServicesService(db)
        return service.create_service_ticket(ticket_in, user_id)

    @staticmethod
    def update_ticket(ticket_id: int, ticket_in: ServiceTicketUpdate, db: Session, user_id: int = None) -> ServiceTicketResponse:
        service = ServicesService(db)
        return service.update_service_ticket(ticket_id, ticket_in, user_id)

    @staticmethod
    def get_ticket(ticket_id: int, db: Session) -> ServiceTicketResponse:
        service = ServicesService(db)
        return service.get_service_ticket(ticket_id)

    @staticmethod
    def delete_ticket(ticket_id: int, db: Session):
        service = ServicesService(db)
        return service.delete_service_ticket(ticket_id)

    @staticmethod
    def get_tickets(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        status: str = None,
        warehouse_id: Optional[Union[int, List[int]]] = None,
    ) -> PaginatedServiceTicketsResponse:
        service = ServicesService(db)
        return service.list_service_tickets(page, page_size, search, status, warehouse_id)

    @staticmethod
    def lookup_barcode(barcode: str, db: Session) -> BarcodeLookupResponse:
        service = ServicesService(db)
        return service.lookup_barcode(barcode)
