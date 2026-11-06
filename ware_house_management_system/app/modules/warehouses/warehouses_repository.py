from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.warehouse import Warehouse


class WarehouseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100, allowed_warehouse_ids: Optional[List[int]] = None) -> List[Warehouse]:
        q = self.db.query(Warehouse)
        if allowed_warehouse_ids is not None:
            q = q.filter(Warehouse.id.in_(allowed_warehouse_ids))
        return q.offset(skip).limit(limit).all()

    def get_by_id(self, warehouse_id: int) -> Optional[Warehouse]:
        return self.db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()

    def create(self, warehouse_data: dict) -> Warehouse:
        db_obj = Warehouse(**warehouse_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, warehouse: Warehouse, update_data: dict) -> Warehouse:
        for field, value in update_data.items():
            setattr(warehouse, field, value)
        self.db.commit()
        self.db.refresh(warehouse)
        return warehouse