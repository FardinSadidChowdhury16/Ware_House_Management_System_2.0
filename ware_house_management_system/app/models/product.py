from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey, DateTime, Date, Boolean, Enum, Table, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class EntityStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class TrackingType(str, enum.Enum):
    SERIALIZED = "serialized"
    BULK = "bulk"


class AttributeFieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    SELECT = "select"


class TaxCalcType(str, enum.Enum):
    FIXED = "fixed"
    PERCENTAGE = "percentage"


# Many-to-Many Table for Product Variant Taxes
product_variant_taxes = Table(
    "product_variant_taxes",
    Base.metadata,
    Column("variant_id", Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), primary_key=True),
    Column("tax_rule_id", Integer, ForeignKey("tax_rules.id", ondelete="CASCADE"), primary_key=True),
)


class ProductType(Base):
    __tablename__ = "product_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    default_tracking_type = Column(Enum(TrackingType, name="tracking_type_enum"), nullable=False, default=TrackingType.SERIALIZED)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    products = relationship("Product", back_populates="category", passive_deletes="RESTRICT")
    attributes = relationship("ProductTypeAttribute", back_populates="product_type", cascade="all, delete-orphan")


class ProductTypeAttribute(Base):
    __tablename__ = "product_type_attributes"

    id = Column(Integer, primary_key=True, index=True)
    product_type_id = Column(Integer, ForeignKey("product_types.id", ondelete="CASCADE"), nullable=False, index=True)
    field_key = Column(String(50), nullable=False)
    field_label = Column(String(100), nullable=False)
    field_type = Column(Enum(AttributeFieldType, name="attribute_field_type"), nullable=False, default=AttributeFieldType.TEXT)
    unit = Column(String(20), nullable=True)
    options = Column(JSONB, nullable=True)
    is_required = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("product_type_id", "field_key", name="uq_product_type_field_key"),)

    product_type = relationship("ProductType", back_populates="attributes")
    values = relationship("ProductVariantAttributeValue", back_populates="attribute", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    product_code = Column(String(50), nullable=True, unique=True, index=True)
    category_id = Column(Integer, ForeignKey("product_types.id", ondelete="RESTRICT"), index=True)
    tracking_type = Column(Enum(TrackingType, name="tracking_type_enum"), nullable=False, default=TrackingType.SERIALIZED)
    min_stock_level = Column(Integer, default=0)
    status = Column(Enum(EntityStatus, name="entity_status"), default=EntityStatus.ACTIVE)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    category = relationship("ProductType", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    serialized_items = relationship("SerializedItem", back_populates="product", cascade="all, delete-orphan")
    bulk_stocks = relationship("BulkWarehouseStock", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=True, unique=True, index=True)
    name = Column(String(150), nullable=True)
    barcode = Column(String(100), unique=True, nullable=True, index=True)
    cost_price = Column(Numeric(12, 2), default=0.00)
    selling_price = Column(Numeric(12, 2), default=0.00)
    status = Column(Enum(EntityStatus, name="entity_status"), default=EntityStatus.ACTIVE)
    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="variants")
    attribute_values = relationship("ProductVariantAttributeValue", back_populates="variant", cascade="all, delete-orphan")
    taxes = relationship("TaxRule", secondary=product_variant_taxes, back_populates="variants")

    @property
    def warehouse_name(self):
        if hasattr(self, "_warehouse_name"):
            return self._warehouse_name
        whs = self.assigned_warehouses
        return ", ".join(whs) if whs else None

    @warehouse_name.setter
    def warehouse_name(self, value):
        self._warehouse_name = value

    @property
    def assigned_warehouses(self):
        if hasattr(self, "_assigned_warehouses"):
            return self._assigned_warehouses
        from sqlalchemy.orm import object_session
        sess = object_session(self)
        if not sess:
            return []
        try:
            from app.models.inventory import SerializedItem, BulkWarehouseStock
            from app.models.warehouse import Warehouse
            from sqlalchemy import or_

            conds = [SerializedItem.variant_id == self.id]
            if self.barcode:
                conds.append(SerializedItem.barcode == self.barcode)
            s_whs = (
                sess.query(Warehouse.name)
                .join(SerializedItem, SerializedItem.warehouse_id == Warehouse.id)
                .filter(or_(*conds))
                .distinct()
                .all()
            )
            b_whs = (
                sess.query(Warehouse.name)
                .join(BulkWarehouseStock, BulkWarehouseStock.warehouse_id == Warehouse.id)
                .filter(BulkWarehouseStock.variant_id == self.id, BulkWarehouseStock.quantity > 0)
                .distinct()
                .all()
            )
            whs = sorted(list(set([w[0] for w in (s_whs + b_whs) if w and w[0]])))
            self._assigned_warehouses = whs
            return whs
        except Exception:
            return []

    @assigned_warehouses.setter
    def assigned_warehouses(self, value):
        self._assigned_warehouses = value

    @property
    def is_stocked_in(self) -> bool:
        if hasattr(self, "_is_stocked_in"):
            return self._is_stocked_in
        return len(self.assigned_warehouses) > 0

    @is_stocked_in.setter
    def is_stocked_in(self, value):
        self._is_stocked_in = value

    @property
    def stock_status(self) -> str:
        if hasattr(self, "_stock_status"):
            return self._stock_status
        return "stocked_in" if self.is_stocked_in else ("sold" if self.is_sold else "not_stocked_in")

    @stock_status.setter
    def stock_status(self, value):
        self._stock_status = value

    @property
    def is_sold(self) -> bool:
        if hasattr(self, "_is_sold"):
            return self._is_sold
        return getattr(self, "_stock_status", "") == "sold"

    @is_sold.setter
    def is_sold(self, value):
        self._is_sold = value

    @property
    def stock_in_details(self):
        return getattr(self, "_stock_in_details", None)

    @stock_in_details.setter
    def stock_in_details(self, value):
        self._stock_in_details = value

    @property
    def stock_out_details(self):
        return getattr(self, "_stock_out_details", None)

    @stock_out_details.setter
    def stock_out_details(self, value):
        self._stock_out_details = value

    @property
    def service_ticket_details(self):
        return getattr(self, "_service_ticket_details", None)

    @service_ticket_details.setter
    def service_ticket_details(self, value):
        self._service_ticket_details = value

    @property
    def attachments(self):
        return getattr(self, "_attachments", [])

    @attachments.setter
    def attachments(self, value):
        self._attachments = value

    @property
    def movements(self):
        return getattr(self, "_movements", [])

    @movements.setter
    def movements(self, value):
        self._movements = value


class ProductVariantAttributeValue(Base):
    __tablename__ = "product_variant_attribute_values"

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    attribute_id = Column(Integer, ForeignKey("product_type_attributes.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("variant_id", "attribute_id", name="uq_variant_attribute"),)

    variant = relationship("ProductVariant", back_populates="attribute_values")
    attribute = relationship("ProductTypeAttribute", back_populates="values")


class TaxRule(Base):
    __tablename__ = "tax_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    calc_type = Column(Enum(TaxCalcType, name="tax_calc_type"), nullable=False)
    value = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    variants = relationship("ProductVariant", secondary=product_variant_taxes, back_populates="taxes")
    

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    price_type = Column(String(20), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    effective_from = Column(DateTime, server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())