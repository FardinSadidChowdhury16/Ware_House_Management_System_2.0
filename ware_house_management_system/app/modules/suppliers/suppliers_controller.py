from sqlalchemy.orm import Session
from app.modules.suppliers.suppliers_service import SupplierService
from app.schemas.party import SupplierCreate, SupplierUpdate


class SupplierController:
    def __init__(self, db: Session):
        self.service = SupplierService(db)

    def get_suppliers(self, skip: int, limit: int):
        return self.service.fetch_all_suppliers(skip=skip, limit=limit)

    def get_supplier(self, supplier_id: int):
        return self.service.fetch_supplier_by_id(supplier_id)

    def create_supplier(self, supplier_in: SupplierCreate):
        return self.service.add_new_supplier(supplier_in)

    def update_supplier(self, supplier_id: int, supplier_in: SupplierUpdate):
        return self.service.update_supplier(supplier_id, supplier_in)

    def toggle_status(self, supplier_id: int):
        return self.service.toggle_supplier_status(supplier_id)