from sqlalchemy.orm import Session
from app.modules.customers.customers_service import (
    create_customer,
    get_customer_by_id,
    get_customers,
    toggle_customer_status,
    update_customer,
)
from app.models.party import Customer
from app.schemas.party import CustomerCreate, CustomerUpdate


class CustomerController:
    def __init__(self, db: Session):
        self.db = db

    def get_customers(self, skip: int = 0, limit: int = 100):
        return get_customers(self.db, skip=skip, limit=limit)

    def get_customer(self, customer_id: int):
        return get_customer_by_id(self.db, customer_id)

    def create_customer(self, customer_in: CustomerCreate):
        return create_customer(self.db, customer_in)

    def update_customer(self, customer_id: int, customer_in: CustomerUpdate):
        customer = get_customer_by_id(self.db, customer_id)
        return update_customer(self.db, customer, customer_in)

    def toggle_status(self, customer_id: int):
        customer = get_customer_by_id(self.db, customer_id)
        return toggle_customer_status(self.db, customer)
