from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission
from app.models.access_control import User
from app.modules.suppliers.suppliers_controller import SupplierController
from app.schemas.party import SupplierCreate, SupplierResponse, SupplierUpdate

router = APIRouter()


@router.get("", response_model=List[SupplierResponse])
def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = SupplierController(db)
    return controller.get_suppliers(skip=skip, limit=limit)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("supplier_write")),
):
    controller = SupplierController(db)
    return controller.create_supplier(supplier_in)


@router.get("/{id}", response_model=SupplierResponse)
def get_supplier(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = SupplierController(db)
    return controller.get_supplier(id)


@router.put("/{id}", response_model=SupplierResponse)
def update_supplier(
    id: int,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("supplier_write")),
):
    controller = SupplierController(db)
    return controller.update_supplier(id, supplier_in)


@router.patch("/{id}/toggle-status", response_model=SupplierResponse)
def toggle_supplier_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("supplier_write")),
):
    controller = SupplierController(db)
    return controller.toggle_status(id)