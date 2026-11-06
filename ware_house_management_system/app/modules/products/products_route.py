import uuid
import random
import time
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission
from app.core.warehouse_access import is_admin_user
from app.models.access_control import User
from app.modules.products.products_controller import ProductsController
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductSummaryResponse,
    ProductUpdate,
    ProductTypeCreate,
    ProductTypeResponse,
    ProductTypeUpdate,
    PaginatedProductsResponse,
    TaxRuleCreate,
    TaxRuleUpdate,
    TaxRuleResponse,
)

router = APIRouter()


def _generate_ean13() -> str:
    """Generate a valid EAN-13 barcode using timestamp + random digits."""
    # Use timestamp (ms) + 3 random digits to form a unique 12-digit base
    ts_part = str(int(time.time() * 1000))[-9:]  # last 9 digits of ms timestamp
    rand_part = str(random.randint(100, 999))
    base12 = ts_part + rand_part  # 12 digits

    # Compute EAN-13 check digit
    odd_sum = sum(int(base12[i]) for i in range(0, 12, 2))
    even_sum = sum(int(base12[i]) for i in range(1, 12, 2))
    check = (10 - ((odd_sum + even_sum * 3) % 10)) % 10

    return base12 + str(check)


# ── Barcode Generation ────────────────────────────────────────────────────────
@router.get("/generate-barcode")
def generate_barcode(
    current_user: User = Depends(get_current_user),
):
    """Generate a unique EAN-13 barcode value."""
    barcode = _generate_ean13()
    return {"barcode": barcode}


@router.get("/generate-barcodes")
def generate_barcodes(
    count: int = Query(1, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    """Generate multiple unique EAN-13 barcode values."""
    barcodes = []
    seen = set()
    while len(barcodes) < count:
        b = _generate_ean13()
        if b not in seen:
            seen.add(b)
            barcodes.append(b)
        time.sleep(0.001)
    return {"barcodes": barcodes}



# Product Types & Attributes
@router.post("/types", response_model=ProductTypeResponse, status_code=status.HTTP_201_CREATED)
def create_product_type(
    type_in: ProductTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.create_product_type(type_in, db)


@router.get("/types", response_model=List[ProductTypeResponse])
def list_product_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    return ProductsController.get_product_types(db)


@router.put("/types/{type_id}", response_model=ProductTypeResponse)
def update_product_type(
    type_id: int,
    type_in: ProductTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.update_product_type(type_id, type_in, db)


@router.delete("/types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    ProductsController.delete_product_type(type_id, db)
    return None


# Tax Rules
@router.post("/taxes", response_model=TaxRuleResponse, status_code=status.HTTP_201_CREATED)
def create_tax_rule(
    tax_in: TaxRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tax_write")),
):
    return ProductsController.create_tax_rule(tax_in, db)


@router.get("/taxes", response_model=List[TaxRuleResponse])
def list_tax_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    return ProductsController.get_tax_rules(db)


@router.put("/taxes/{tax_id}", response_model=TaxRuleResponse)
def update_tax_rule(
    tax_id: int,
    tax_in: TaxRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tax_write")),
):
    return ProductsController.update_tax_rule(tax_id, tax_in, db)


@router.delete("/taxes/{tax_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tax_rule(
    tax_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tax_write")),
):
    ProductsController.delete_tax_rule(tax_id, db)
    return None


# Products
@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.create_product(product_in, db)


@router.get("/summary", response_model=List[ProductSummaryResponse])
def list_products_summary(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    return ProductsController.get_products_summary(skip, limit, db)


@router.get("", response_model=Union[PaginatedProductsResponse, List[ProductResponse]])
def list_products(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=50000),
    search: Optional[str] = Query(None),
    tracking: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    stock_status: Optional[str] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    from app.core.warehouse_access import is_admin_user, get_user_assigned_warehouse_ids
    admin = is_admin_user(current_user)
    allowed_wh_ids = None if admin else get_user_assigned_warehouse_ids(db, current_user)

    if page is not None:
        size = page_size or 10
        return ProductsController.get_products_paginated(
            db=db,
            page=page,
            page_size=size,
            search=search,
            tracking=tracking,
            status=status_filter,
            stock_status=stock_status,
            warehouse_id=warehouse_id,
            allowed_warehouse_ids=allowed_wh_ids,
        )
    return ProductsController.get_products(skip, limit, db)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    return ProductsController.get_product(product_id, db, current_user=current_user)


@router.get("/{product_id}/details", response_model=ProductResponse)
def get_product_details(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    return ProductsController.get_product_detail(product_id, db, current_user=current_user)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.update_product(product_id, product_in, db, current_user=current_user)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    ProductsController.delete_product(product_id, db, current_user=current_user)
    return None