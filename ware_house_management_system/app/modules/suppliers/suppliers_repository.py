from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.party import Supplier


class SupplierRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> List[Supplier]:
        return self.db.query(Supplier).offset(skip).limit(limit).all()

    def get_by_id(self, supplier_id: int) -> Optional[Supplier]:
        return self.db.query(Supplier).filter(Supplier.id == supplier_id).first()

    def create(self, supplier_data: dict) -> Supplier:
        db_obj = Supplier(**supplier_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, supplier: Supplier, update_data: dict) -> Supplier:
        for field, value in update_data.items():
            setattr(supplier, field, value)
        self.db.commit()
        self.db.refresh(supplier)
        return supplier