from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.party import Customer
from app.schemas.party import CustomerCreate, CustomerUpdate


def get_customers(db: Session, skip: int = 0, limit: int = 100) -> List[Customer]:
    return db.query(Customer).order_by(Customer.id.desc()).offset(skip).limit(limit).all()


def get_customer_by_id(db: Session, customer_id: int) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.id == customer_id).first()


def create_customer(db: Session, obj_in: CustomerCreate) -> Customer:
    db_obj = Customer(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_customer(db: Session, db_obj: Customer, obj_in: CustomerUpdate) -> Customer:
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def toggle_customer_status(db: Session, db_obj: Customer) -> Customer:
    db_obj.status = not db_obj.status
    db.commit()
    db.refresh(db_obj)
    return db_obj