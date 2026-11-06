from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Table, func
from sqlalchemy.orm import relationship
from app.core.database import Base

# Association Table for User & Warehouse Access
user_warehouses = Table(
    "user_warehouses",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("warehouse_id", Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, server_default=func.now()),
)


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False, unique=True, index=True)
    address = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    users = relationship("User", secondary=user_warehouses, back_populates="warehouses")
    product_items = relationship("SerializedItem", back_populates="warehouse")
    inventories = relationship("BulkWarehouseStock", back_populates="warehouse", cascade="all, delete-orphan")