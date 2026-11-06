from fastapi import HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.warehouses.warehouses_repository import WarehouseRepository
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate


class WarehouseService:
    def __init__(self, db: Session):
        self.repo = WarehouseRepository(db)

    def fetch_all_warehouses(self, skip: int = 0, limit: int = 100, allowed_warehouse_ids: Optional[List[int]] = None):
        return self.repo.get_all(skip=skip, limit=limit, allowed_warehouse_ids=allowed_warehouse_ids)

    def fetch_warehouse_by_id(self, warehouse_id: int):
        warehouse = self.repo.get_by_id(warehouse_id)
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warehouse not found",
            )
        return warehouse

    def add_new_warehouse(self, warehouse_in: WarehouseCreate):
        return self.repo.create(warehouse_in.model_dump())

    def update_warehouse(self, warehouse_id: int, warehouse_in: WarehouseUpdate):
        warehouse = self.fetch_warehouse_by_id(warehouse_id)
        update_data = warehouse_in.model_dump(exclude_unset=True)
        return self.repo.update(warehouse, update_data)

    def toggle_warehouse_status(self, warehouse_id: int):
        warehouse = self.fetch_warehouse_by_id(warehouse_id)
        return self.repo.update(warehouse, {"status": not warehouse.status})