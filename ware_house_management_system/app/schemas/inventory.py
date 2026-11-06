from datetime import datetime, date
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict
from app.models.inventory import ItemStatus, MovementType

# Serialized Item Schemas
class SerializedItemBase(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    serial_number: str
    barcode: Optional[str] = None
    status: ItemStatus = ItemStatus.IN_STOCK
    photo_url: Optional[str] = None
    supplier_id: Optional[int] = None
    customer_id: Optional[int] = None
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    description: Optional[str] = None
    attribute: Optional[Dict[str, Any]] = None

class SellSerializedItemRequest(BaseModel):
    reference_number: str  # e.g.: Sales order number "SO-2026-001"
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SerializedItemCreate(SerializedItemBase):
    pass


class SerializedItemResponse(SerializedItemBase):
    id: int
    product_name: Optional[str] = None
    warehouse_name: Optional[str] = None
    variant_name: Optional[str] = None
    selling_price: Optional[float] = 0.0
    effective_barcode: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Bulk Stock Schemas
class BulkWarehouseStockResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    warehouse_id: int
    quantity: int
    updated_at: datetime

    class Config:
        from_attributes = True


# Stock Movement Schemas
class StockMovementCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    product_item_id: Optional[int] = None
    movement_type: MovementType
    quantity: int = 1
    from_warehouse_id: Optional[int] = None
    to_warehouse_id: Optional[int] = None
    supplier_id: Optional[int] = None
    customer_id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    note: Optional[str] = None
    attachment_url: Optional[str] = None


class StockMovementResponse(StockMovementCreate):
    id: int
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StockInLineItem(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1
    serial_numbers: Optional[List[str]] = None  # for serialized products
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    model_config = ConfigDict(extra="ignore")

class StockInRequest(BaseModel):
    warehouse_id: int
    supplier_id: Optional[int] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None
    attachment_url: Optional[str] = None
    items: List[StockInLineItem]
    model_config = ConfigDict(extra="ignore")

class StockInResponse(BaseModel):
    message: str
    movements_created: int
    serialized_items_created: int
    bulk_items_updated: int

class StockOutLineItem(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1
    serial_numbers: Optional[List[str]] = None
    model_config = ConfigDict(extra="ignore")

class StockOutRequest(BaseModel):
    warehouse_id: int
    customer_id: Optional[int] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None
    attachment_url: Optional[str] = None
    items: List[StockOutLineItem]
    model_config = ConfigDict(extra="ignore")

class TransferLineItem(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1
    serial_numbers: Optional[List[str]] = None
    model_config = ConfigDict(extra="ignore")

class TransferRequest(BaseModel):
    from_warehouse_id: int
    to_warehouse_id: int
    reference_number: Optional[str] = None
    note: Optional[str] = None
    attachment_url: Optional[str] = None
    items: List[TransferLineItem]
    model_config = ConfigDict(extra="ignore")

class TransferResponse(BaseModel):
    message: str
    movements_created: int
    serialized_items_transferred: int
    bulk_items_transferred: int

class ItemLookupResponse(BaseModel):
    found: bool
    message: Optional[str] = None
    type: Optional[str] = None  # "serialized" or "bulk"
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    tracking_type: Optional[str] = None
    variant_id: Optional[int] = None
    variant_sku: Optional[str] = None
    variant_name: Optional[str] = None
    barcode: Optional[str] = None
    serial_number: Optional[str] = None
    current_warehouse_id: Optional[int] = None
    current_warehouse_name: Optional[str] = None
    status: Optional[str] = None
    available_qty: int = 0
    in_source_warehouse: bool = False
    model_config = ConfigDict(extra="ignore")

# For paginated movement list with joined names
class StockMovementListItem(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    variant_id: Optional[int] = None
    variant_sku: Optional[str] = None
    variant_name: Optional[str] = None
    barcode: Optional[str] = None
    serial_number: Optional[str] = None
    tracking_type: Optional[str] = None
    product_item_id: Optional[int] = None
    movement_type: str
    quantity: int
    unit_price: Optional[float] = 0.0
    total_price: Optional[float] = 0.0
    from_warehouse_id: Optional[int] = None
    from_warehouse_name: Optional[str] = None
    to_warehouse_id: Optional[int] = None
    to_warehouse_name: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PaginatedMovementsResponse(BaseModel):
    items: List[StockMovementListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

# Sales Report Schemas
class SalesReportSummary(BaseModel):
    total_sales_amount: float = 0.0
    total_units_sold: int = 0
    total_products_sold: int = 0
    total_transactions: int = 0
    top_category: Optional[str] = None
    top_product: Optional[str] = None

class ProductSalesBreakdown(BaseModel):
    product_id: int
    product_name: str
    product_code: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    tracking_type: str = "bulk"
    unit_price: float = 0.0
    total_units_sold: int = 0
    total_sales_value: float = 0.0
    warehouse_names: List[str] = []

class CategorySalesBreakdown(BaseModel):
    category_id: Optional[int] = None
    category_name: str
    total_units_sold: int = 0
    total_sales_value: float = 0.0

class StockSalesReportResponse(BaseModel):
    summary: SalesReportSummary
    product_breakdown: List[ProductSalesBreakdown]
    category_breakdown: List[CategorySalesBreakdown]
    transactions: PaginatedMovementsResponse
