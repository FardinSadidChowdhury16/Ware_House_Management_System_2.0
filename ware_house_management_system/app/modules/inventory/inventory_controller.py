from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.inventory.inventory_service import InventoryService  
from app.schemas.inventory import SellSerializedItemRequest
from app.modules.inventory.inventory_service import InventoryService
from app.schemas.inventory import (
    SerializedItemCreate,
    SerializedItemResponse,
    BulkWarehouseStockResponse,
    StockMovementCreate,
    StockMovementResponse,
    StockInRequest,
    StockInResponse,
    PaginatedMovementsResponse,
)
from app.models.inventory import ItemStatus
from app.models.access_control import User


class InventoryController:
    @staticmethod
    def create_serialized_item(item_in: SerializedItemCreate, db: Session) -> SerializedItemResponse:
        service = InventoryService(db)
        return service.add_serialized_item(item_in)

    @staticmethod
    def get_serialized_items(
        db: Session,
        warehouse_id: Optional[int] = None,
        product_id: Optional[int] = None,
        status: Optional[ItemStatus] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ) -> List[SerializedItemResponse]:
        service = InventoryService(db)
        return service.fetch_serialized_items(warehouse_id, product_id, status, allowed_warehouse_ids)
   
    @staticmethod
    def sell_serialized_item(
        serial_number: str, 
        payload: SellSerializedItemRequest, 
        current_user: User, 
        db: Session
    ):
        service = InventoryService(db)
        return service.sell_serialized_item(
            serial_number=serial_number, 
            payload=payload, 
            user_id=current_user.id
        )
        
    @staticmethod
    def get_bulk_stock(
        db: Session,
        warehouse_id: Optional[int] = None,
        product_id: Optional[int] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ) -> List[BulkWarehouseStockResponse]:
        service = InventoryService(db)
        return service.fetch_bulk_stock(warehouse_id, product_id, allowed_warehouse_ids)

    @staticmethod
    def create_movement(
        movement_in: StockMovementCreate, current_user: User, db: Session
    ) -> StockMovementResponse:
        service = InventoryService(db)
        return service.process_stock_movement(movement_in, current_user.id)

    @staticmethod
    def stock_in(stock_in_data: StockInRequest, current_user: User, db: Session) -> StockInResponse:
        service = InventoryService(db)
        return service.process_stock_in(stock_in_data, current_user.id)

    @staticmethod
    def list_movements(
        db: Session, 
        page: int = 1, 
        page_size: int = 10, 
        warehouse_id: Optional[int] = None, 
        product_id: Optional[int] = None, 
        movement_type: Optional[str] = None, 
        direction: Optional[str] = None,
        date_from: Optional[str] = None, 
        date_to: Optional[str] = None,
        search: Optional[str] = None,
        barcode: Optional[str] = None,
        name: Optional[str] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ) -> PaginatedMovementsResponse:
        service = InventoryService(db)
        
        # Convert string dates to datetime.date if they exist
        from datetime import datetime
        d_from = datetime.strptime(date_from, "%Y-%m-%d").date() if date_from else None
        d_to = datetime.strptime(date_to, "%Y-%m-%d").date() if date_to else None
        
        items, total = service.repo.get_movements_paginated(
            page=page,
            page_size=page_size,
            warehouse_id=warehouse_id,
            product_id=product_id,
            movement_type=movement_type,
            direction=direction,
            date_from=d_from,
            date_to=d_to,
            search=search,
            barcode=barcode,
            name=name,
            allowed_warehouse_ids=allowed_warehouse_ids,
        )
        import math
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        
        return PaginatedMovementsResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    @staticmethod
    def get_stock_in_stats(db: Session):
        service = InventoryService(db)
        return service.get_stock_in_stats()

    @staticmethod
    def get_warehouse_stock_summary(
        db: Session,
        warehouse_id: Optional[int] = None,
        search: Optional[str] = None,
        tracking_type: Optional[str] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ):
        service = InventoryService(db)
        return service.get_warehouse_stock_summary(
            warehouse_id=warehouse_id,
            search=search,
            tracking_type=tracking_type,
            allowed_warehouse_ids=allowed_warehouse_ids,
        )

    @staticmethod
    def lookup_item(db: Session, code: str, warehouse_id: Optional[int] = None):
        service = InventoryService(db)
        return service.lookup_item(code, warehouse_id)

    @staticmethod
    def process_transfer(db: Session, data, current_user: User):
        service = InventoryService(db)
        return service.process_transfer(data, current_user.id)


    @staticmethod
    def get_sales_report(
        db: Session,
        warehouse_id: Optional[int] = None,
        category_id: Optional[int] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        search: Optional[str] = None,
        product_id: Optional[int] = None,
        barcode: Optional[str] = None,
        name: Optional[str] = None,
        page: int = 1,
        page_size: int = 15,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ):
        service = InventoryService(db)
        return service.get_sales_report(
            warehouse_id=warehouse_id,
            category_id=category_id,
            date_from=date_from,
            date_to=date_to,
            search=search,
            product_id=product_id,
            barcode=barcode,
            name=name,
            page=page,
            page_size=page_size,
            allowed_warehouse_ids=allowed_warehouse_ids,
        )
