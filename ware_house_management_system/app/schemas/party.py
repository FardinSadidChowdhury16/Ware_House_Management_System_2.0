from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.core.enums import CustomerType


# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    shipping_details: Optional[str] = None
    billing_details: Optional[str] = None
    customer_type: CustomerType = CustomerType.CORPORATE


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    shipping_details: Optional[str] = None
    billing_details: Optional[str] = None
    customer_type: Optional[CustomerType] = None


class CustomerResponse(CustomerBase):
    id: int
    status: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Supplier Schemas ---
class SupplierBase(BaseModel):
    supplier_code: Optional[str] = None
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    billing_details: Optional[str] = None
    shipping_details: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    supplier_code: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    billing_details: Optional[str] = None
    shipping_details: Optional[str] = None


class SupplierResponse(SupplierBase):
    id: int
    status: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True