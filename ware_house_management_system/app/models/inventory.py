from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Date, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ItemStatus(str, enum.Enum):
    IN_STOCK = "in_stock"
    RESERVED = "reserved"
    SOLD = "sold"
    IN_TRANSIT = "in_transit"
    DAMAGED = "damaged"
    UNDER_SERVICE = "under_service"
    RETURNED = "returned"


class MovementType(str, enum.Enum):
    PURCHASE_IN = "purchase_in"
    SALE_OUT = "sale_out"
    TRANSFER_OUT = "transfer_out"
    TRANSFER_IN = "transfer_in"
    ADJUSTMENT_IN = "adjustment_in"
    ADJUSTMENT_OUT = "adjustment_out"
    RETURN_IN = "return_in"
    SERVICE_OUT = "service_out"
    SERVICE_IN = "service_in"
    REPLACE_OUT = "replace_out"
    REPLACE_IN = "replace_in"


class SerializedItem(Base):
    __tablename__ = "serialized_items"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    serial_number = Column(String(100), nullable=False, unique=True, index=True)
    barcode = Column(String(100), unique=True, nullable=True, index=True)
    status = Column(Enum(ItemStatus, name="item_status"), default=ItemStatus.IN_STOCK)
    photo_url = Column(Text, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    warranty_start = Column(Date, nullable=True)
    warranty_end = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    attribute = Column(JSONB, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="serialized_items")
    variant = relationship("ProductVariant")
    warehouse = relationship("Warehouse", back_populates="product_items")
    supplier = relationship("Supplier")
    customer = relationship("Customer")
    warranty_claims = relationship(
        "SerializedWarrantyClaim",
        back_populates="product_item",
        primaryjoin="SerializedItem.id==SerializedWarrantyClaim.product_item_id",
    )
    service_records = relationship("SerializedServiceRecord", back_populates="product_item")

    @property
    def product_name(self):
        return self.product.name if self.product else None

    @property
    def warehouse_name(self):
        return self.warehouse.name if self.warehouse else None

    @property
    def variant_name(self):
        return self.variant.name if self.variant else None

    @property
    def selling_price(self):
        return float(self.variant.selling_price) if self.variant and self.variant.selling_price is not None else 0.0

    @property
    def effective_barcode(self):
        return self.barcode or (self.variant.barcode if self.variant else None) or self.serial_number


class BulkWarehouseStock(Base):
    __tablename__ = "bulk_warehouse_stock"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("product_id", "variant_id", "warehouse_id", name="uq_bulk_product_variant_warehouse"),)

    product = relationship("Product", back_populates="bulk_stocks")
    variant = relationship("ProductVariant")
    warehouse = relationship("Warehouse", back_populates="inventories")


class BulkCustomerStock(Base):
    __tablename__ = "bulk_customer_stock"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("product_id", "variant_id", "customer_id", name="uq_bulk_product_variant_customer"),)

    product = relationship("Product")
    variant = relationship("ProductVariant")
    customer = relationship("Customer")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, index=True)
    product_item_id = Column(Integer, ForeignKey("serialized_items.id", ondelete="CASCADE"), nullable=True, index=True)
    movement_type = Column(Enum(MovementType, name="movement_type_enum"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    note = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())