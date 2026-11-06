from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    shipping_details = Column(Text, nullable=True)
    billing_details = Column(Text, nullable=True)
    customer_type = Column(String(50), default="corporate")
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False, index=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    billing_details = Column(Text, nullable=True)
    shipping_details = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())