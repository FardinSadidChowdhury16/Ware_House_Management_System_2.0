from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.modules.suppliers.suppliers_repository import SupplierRepository
from app.schemas.party import SupplierCreate, SupplierUpdate


class SupplierService:
    def __init__(self, db: Session):
        self.repo = SupplierRepository(db)

    def fetch_all_suppliers(self, skip: int = 0, limit: int = 100):
        return self.repo.get_all(skip=skip, limit=limit)

    def fetch_supplier_by_id(self, supplier_id: int):
        supplier = self.repo.get_by_id(supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found",
            )
        return supplier

    def add_new_supplier(self, supplier_in: SupplierCreate):
        return self.repo.create(supplier_in.model_dump())

    def update_supplier(self, supplier_id: int, supplier_in: SupplierUpdate):
        supplier = self.fetch_supplier_by_id(supplier_id)
        update_data = supplier_in.model_dump(exclude_unset=True)
        return self.repo.update(supplier, update_data)

    def toggle_supplier_status(self, supplier_id: int):
        supplier = self.fetch_supplier_by_id(supplier_id)
        return self.repo.update(supplier, {"status": not supplier.status})