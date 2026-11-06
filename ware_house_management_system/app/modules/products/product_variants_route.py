from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.core.permissions import require_permission
from app.models.access_control import User
from app.modules.products.products_controller import ProductsController
from app.schemas.product import (
    PaginatedVariantsResponse,
    ProductVariantCreate,
    ProductVariantPriceUpdate,
    ProductVariantResponse,
    ProductVariantUpdate,
    VariantBatchUpdateRequest,
    VariantBatchUpdateResponse,
)

router = APIRouter(prefix="/products/{product_id}/variants", tags=["Product Variants"])


@router.get("", response_model=PaginatedVariantsResponse)
def list_variants_for_product(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50000),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    warehouse_id: Optional[int] = Query(None),
    stock_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    from app.core.warehouse_access import is_admin_user, get_user_assigned_warehouse_ids

    admin = is_admin_user(current_user)
    allowed_wh_ids = None if admin else get_user_assigned_warehouse_ids(db, current_user)

    if not admin and warehouse_id is not None and warehouse_id not in (allowed_wh_ids or []):
        return PaginatedVariantsResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)

    return ProductsController.get_variants_paginated(
        product_id=product_id,
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
        warehouse_id=warehouse_id,
        stock_status=stock_status,
        allowed_warehouse_ids=allowed_wh_ids,
    )


@router.post("/batch", response_model=List[ProductVariantResponse], status_code=status.HTTP_201_CREATED)
def create_variants_batch_for_product(
    product_id: int,
    variants_in: List[ProductVariantCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.create_variants_batch(product_id, variants_in, db, current_user=current_user)


@router.post("", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant_for_product(
    product_id: int,
    variant_in: ProductVariantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.create_variant(product_id, variant_in, db, current_user=current_user)


@router.get("/{variant_id}", response_model=ProductVariantResponse)
def get_variant_for_product(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_read")),
):
    return ProductsController.get_variant(product_id, variant_id, db, current_user=current_user)


@router.put("/{variant_id}", response_model=ProductVariantResponse)
def update_variant_for_product(
    product_id: int,
    variant_id: int,
    variant_in: ProductVariantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.update_variant(product_id, variant_id, variant_in, db, current_user=current_user)


@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant_for_product(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    ProductsController.delete_variant(product_id, variant_id, db, current_user=current_user)
    return None


@router.patch("/{variant_id}/price", response_model=ProductVariantResponse)
def update_variant_price(
    product_id: int,
    variant_id: int,
    price_update: ProductVariantPriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.update_variant_price(
        product_id,
        variant_id,
        price_update.cost_price,
        price_update.selling_price,
        db,
        current_user=current_user,
    )



@router.post("/batch-update", response_model=VariantBatchUpdateResponse)
def batch_update_variants_for_product(
    product_id: int,
    batch_req: VariantBatchUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("product_write")),
):
    return ProductsController.batch_update_variants(
        product_id=product_id,
        items=batch_req.items,
        db=db,
        current_user=current_user,
    )
