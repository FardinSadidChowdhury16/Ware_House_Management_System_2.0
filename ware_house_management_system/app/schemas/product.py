from datetime import datetime, date
from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from app.models.product import EntityStatus, TrackingType, AttributeFieldType, TaxCalcType


# Product Type Attribute Schemas
class ProductTypeAttributeBase(BaseModel):
    field_key: str
    field_label: str
    field_type: AttributeFieldType = AttributeFieldType.TEXT
    unit: Optional[str] = None
    options: Optional[List[Any]] = None
    is_required: bool = False
    display_order: int = 0


class ProductTypeAttributeCreate(ProductTypeAttributeBase):
    pass


class ProductTypeAttributeResponse(ProductTypeAttributeBase):
    id: int
    product_type_id: int

    class Config:
        from_attributes = True


# Product Type Schemas
class ProductTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    default_tracking_type: TrackingType = TrackingType.SERIALIZED


class ProductTypeCreate(ProductTypeBase):
    attributes: Optional[List[ProductTypeAttributeCreate]] = []


class ProductTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_tracking_type: Optional[TrackingType] = None
    attributes: Optional[List[ProductTypeAttributeCreate]] = None


class ProductTypeResponse(ProductTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    attributes: List[ProductTypeAttributeResponse] = []

    class Config:
        from_attributes = True


# Product Variant Attribute Value Schemas
class AttributeValueInput(BaseModel):
    attribute_id: int
    value: str


class AttributeValueResponse(BaseModel):
    id: int
    attribute_id: int
    value: Optional[str] = None
    attribute: Optional[ProductTypeAttributeResponse] = None

    class Config:
        from_attributes = True


# Tax Rule Schemas
class TaxRuleBase(BaseModel):
    name: str
    calc_type: TaxCalcType
    value: float
    description: Optional[str] = None


class TaxRuleCreate(TaxRuleBase):
    pass


class TaxRuleUpdate(BaseModel):
    name: Optional[str] = None
    calc_type: Optional[TaxCalcType] = None
    value: Optional[float] = None
    description: Optional[str] = None


class TaxRuleResponse(TaxRuleBase):
    id: int

    class Config:
        from_attributes = True


# Product Variant Schemas
class ProductVariantBase(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    barcode: Optional[str] = None
    cost_price: float = 0.0
    selling_price: float = 0.0
    status: EntityStatus = EntityStatus.ACTIVE
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None


class ProductVariantCreate(ProductVariantBase):
    attribute_values: Optional[List[AttributeValueInput]] = []
    tax_rule_ids: Optional[List[int]] = []


class ProductVariantUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    barcode: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    status: Optional[EntityStatus] = None
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None


class ProductVariantPriceUpdate(BaseModel):
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None


class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int
    created_at: datetime
    updated_at: datetime
    attribute_values: List[AttributeValueResponse] = []
    taxes: List[TaxRuleResponse] = []
    warehouse_name: Optional[str] = None
    assigned_warehouses: Optional[List[str]] = []
    is_stocked_in: Optional[bool] = None
    is_sold: Optional[bool] = False
    stock_status: Optional[str] = None
    stock_in_details: Optional[dict] = None
    stock_out_details: Optional[dict] = None
    service_ticket_details: Optional[dict] = None
    attachments: Optional[List[dict]] = []
    movements: Optional[List[dict]] = []

    class Config:
        from_attributes = True


# Base Product Schemas
class ProductBase(BaseModel):
    name: str
    product_code: Optional[str] = None
    category_id: int
    tracking_type: TrackingType = TrackingType.SERIALIZED
    min_stock_level: int = 0
    status: EntityStatus = EntityStatus.ACTIVE


class ProductCreate(ProductBase):
    # variants কে Optional এবং ডিফল্ট ফাঁকা লিস্ট করা হলো
    variants: Optional[List[ProductVariantCreate]] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_code: Optional[str] = None
    category_id: Optional[int] = None
    tracking_type: Optional[TrackingType] = None
    min_stock_level: Optional[int] = None
    status: Optional[EntityStatus] = None


class ProductSummaryResponse(BaseModel):
    id: int
    name: str
    product_code: Optional[str] = None
    category_id: Optional[int] = None
    tracking_type: TrackingType = TrackingType.SERIALIZED
    min_stock_level: int = 0
    status: EntityStatus = EntityStatus.ACTIVE
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    variants: List[ProductVariantResponse] = []

    class Config:
        from_attributes = True


class PaginatedProductsResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedVariantsResponse(BaseModel):
    items: List[ProductVariantResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class VariantBatchUpdateError(BaseModel):
    row: int
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    message: str


class VariantBatchUpdateResponse(BaseModel):
    total_processed: int
    total_updated: int
    total_failed: int
    all_done: bool
    errors: List[VariantBatchUpdateError] = []
    updated_items: List[Dict[str, Any]] = []


class VariantBatchUpdateRequest(BaseModel):
    items: List[Dict[str, Any]]
