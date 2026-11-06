from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission
from app.models.access_control import User
from app.modules.customers.customers_controller import CustomerController
from app.schemas.party import CustomerCreate, CustomerResponse, CustomerUpdate

router = APIRouter()


@router.get("", response_model=List[CustomerResponse])
def get_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = CustomerController(db)
    return controller.get_customers(skip=skip, limit=limit)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customer_write")),
):
    controller = CustomerController(db)
    return controller.create_customer(customer_in)


@router.get("/{id}", response_model=CustomerResponse)
def get_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = CustomerController(db)
    return controller.get_customer(id)


@router.put("/{id}", response_model=CustomerResponse)
def update_customer(
    id: int,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customer_write")),
):
    controller = CustomerController(db)
    return controller.update_customer(id, customer_in)


@router.patch("/{id}/toggle-status", response_model=CustomerResponse)
def toggle_customer_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customer_write")),
):
    controller = CustomerController(db)
    return controller.toggle_status(id)
