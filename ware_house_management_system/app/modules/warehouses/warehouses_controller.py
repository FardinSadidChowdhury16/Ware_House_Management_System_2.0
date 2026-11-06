from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.warehouses.warehouses_service import WarehouseService
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate


class WarehouseController:
    def __init__(self, db: Session):
        self.service = WarehouseService(db)

    def get_warehouses(self, skip: int, limit: int, allowed_warehouse_ids: Optional[List[int]] = None):
        return self.service.fetch_all_warehouses(skip=skip, limit=limit, allowed_warehouse_ids=allowed_warehouse_ids)

    def get_warehouse(self, warehouse_id: int):
        return self.service.fetch_warehouse_by_id(warehouse_id)

    def create_warehouse(self, warehouse_in: WarehouseCreate):
        return self.service.add_new_warehouse(warehouse_in)

    def update_warehouse(self, warehouse_id: int, warehouse_in: WarehouseUpdate):
        return self.service.update_warehouse(warehouse_id, warehouse_in)

    def toggle_status(self, warehouse_id: int):
        return self.service.toggle_warehouse_status(warehouse_id)