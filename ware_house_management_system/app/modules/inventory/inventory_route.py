from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.modules.inventory.inventory_service import InventoryService
from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission
from app.models.access_control import User
from app.models.inventory import ItemStatus
from app.modules.inventory.inventory_controller import InventoryController
from app.schemas.inventory import (
    SerializedItemCreate,
    SerializedItemResponse,
    BulkWarehouseStockResponse,
    StockMovementCreate,
    StockMovementResponse,
    SellSerializedItemRequest,
    StockInRequest,
    StockInResponse,
    PaginatedMovementsResponse,
    StockSalesReportResponse,
)

router = APIRouter(tags=["Inventory"])


def _resolve_user_warehouses(db: Session, user: User, requested_id: Optional[int] = None):
    u = db.query(User).filter(User.id == user.id).first()
    assigned = [w.id for w in u.warehouses] if u and u.warehouses else []
    is_admin = bool(u and u.role and ("admin" in u.role.name.lower() or "administrator" in u.role.name.lower()))
    
    if requested_id is not None:
        if not is_admin and requested_id not in assigned:
            return False, []
        return True, [requested_id]
        
    return True, (assigned if not is_admin else None)


@router.post("/items", response_model=SerializedItemResponse, status_code=status.HTTP_201_CREATED)
def create_serialized_item(
    item_in: SerializedItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.warehouse_access import is_admin_user, get_user_assigned_warehouse_ids
    if not is_admin_user(current_user) and item_in.warehouse_id is not None:
        assigned = get_user_assigned_warehouse_ids(db, current_user)
        if item_in.warehouse_id not in assigned:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot assign items to a warehouse you are not assigned to.",
            )
    return InventoryController.create_serialized_item(item_in, db)


@router.get("/items", response_model=List[SerializedItemResponse])
def list_serialized_items(
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    status_filter: Optional[ItemStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed, target_wh_ids = _resolve_user_warehouses(db, current_user, warehouse_id)
    if not allowed:
        return []
    return InventoryController.get_serialized_items(
        db,
        warehouse_id=warehouse_id,
        product_id=product_id,
        status=status_filter,
        allowed_warehouse_ids=target_wh_ids,
    )


@router.get("/bulk", response_model=List[BulkWarehouseStockResponse])
def get_bulk_stock(
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed, target_wh_ids = _resolve_user_warehouses(db, current_user, warehouse_id)
    if not allowed:
        return []
    return InventoryController.get_bulk_stock(
        db,
        warehouse_id=warehouse_id if target_wh_ids and len(target_wh_ids) == 1 else None,
        product_id=product_id,
        allowed_warehouse_ids=target_wh_ids,
    )


@router.get("/warehouse-summary", summary="Get inventory stock summary grouped by product and warehouse")
def get_warehouse_inventory_summary(
    warehouse_id: Optional[int] = None,
    search: Optional[str] = None,
    tracking_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed, target_wh_ids = _resolve_user_warehouses(db, current_user, warehouse_id)
    if not allowed:
        return {
            "selected_warehouse": None,
            "summary": {
                "total_in_stock": 0,
                "total_servicing": 0,
                "total_products": 0,
                "total_stock_in": 0,
                "total_stock_out": 0,
                "total_transfer_in": 0,
                "total_transfer_out": 0,
                "total_transfers": 0,
                "total_received": 0,
                "total_customer": 0,
            },
            "items": [],
        }
    return InventoryController.get_warehouse_stock_summary(
        db,
        warehouse_id=warehouse_id,
        search=search,
        tracking_type=tracking_type,
        allowed_warehouse_ids=target_wh_ids,
    )


@router.post("/movements", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def record_stock_movement(
    movement_in: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InventoryController.create_movement(movement_in, current_user, db)
  
@router.post(
    "/items/{serial_number}/sell",
    response_model=SerializedItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Sell a serialized item"
)
def sell_serialized_item(
    serial_number: str,
    payload: SellSerializedItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates serialized item status from IN_STOCK to SOLD
    and logs an outbound stock movement record.
    """
    from app.core.warehouse_access import is_admin_user, get_user_assigned_warehouse_ids
    from app.models.inventory import SerializedItem
    from fastapi import HTTPException

    item = db.query(SerializedItem).filter(SerializedItem.serial_number == serial_number).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Serialized item '{serial_number}' not found.")

    if not is_admin_user(current_user):
        assigned = get_user_assigned_warehouse_ids(db, current_user)
        if item.warehouse_id not in assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot sell item belonging to another warehouse.",
            )

    return InventoryController.sell_serialized_item(serial_number, payload, current_user, db)

@router.post("/stock-in", response_model=StockInResponse, status_code=status.HTTP_201_CREATED)
def stock_in(
    stock_in_data: StockInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stock-In submission — does not update stock directly.
    Submitted to the approval queue as PENDING.
    Stock updates and movements are recorded only after an approver approves this request.
    """
    from app.modules.approvals.approvals_service import ApprovalsService
    service = ApprovalsService(db)
    approval = service.submit_stock_in(stock_in_data, current_user.id)
    return StockInResponse(
        message="Stock In submitted for approval. Pending review.",
        movements_created=0,
        serialized_items_created=0,
        bulk_items_updated=0,
    )

@router.get("/movements", response_model=PaginatedMovementsResponse)
def list_movements(
    page: int = 1,
    page_size: int = 10,
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    direction: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed, target_wh_ids = _resolve_user_warehouses(db, current_user, warehouse_id)
    if not allowed:
        return PaginatedMovementsResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
    return InventoryController.list_movements(
        db,
        page,
        page_size,
        warehouse_id,
        product_id,
        movement_type,
        direction,
        date_from,
        date_to,
        search,
        allowed_warehouse_ids=target_wh_ids,
    )

@router.get("/sales-report", summary="Get comprehensive stock sell report with metrics, item breakdown, and orders")
def get_sales_report(
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed, target_wh_ids = _resolve_user_warehouses(db, current_user, warehouse_id)
    if not allowed:
        return {
            "summary": {
                "total_sales_amount": 0.0,
                "total_units_sold": 0,
                "total_products_sold": 0,
                "total_transactions": 0,
                "top_category": None,
                "top_product": None,
            },
            "product_breakdown": [],
            "category_breakdown": [],
            "transactions": {
                "items": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
            },
        }
    return InventoryController.get_sales_report(
        db,
        warehouse_id=warehouse_id,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        page_size=page_size,
        allowed_warehouse_ids=target_wh_ids,
    )

@router.get("/stats")
def get_stock_in_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return InventoryController.get_stock_in_stats(db)


@router.get("/barcode-lookup", summary="Lookup product/variant/serial by barcode")
def barcode_lookup(
    barcode: str,
    warehouse_id: Optional[int] = None,
    purpose: Optional[str] = None,  # "stock_in", "stock_out", "transfer"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search and retrieve product, variant, and serialized item information by barcode.
    In Stock In mode, identifies barcodes already assigned to a warehouse or previously stocked in as duplicates.
    """
    from app.models.product import Product, ProductVariant
    from app.models.warehouse import Warehouse
    from app.models.inventory import SerializedItem, ItemStatus, BulkWarehouseStock
    from sqlalchemy import func
    from fastapi import HTTPException, status as http_status

    barcode_clean = barcode.strip()

    def _get_stock(p_id: int, v_id: Optional[int], is_ser: bool) -> int:
        if is_ser:
            q = db.query(func.count(SerializedItem.id)).filter(
                SerializedItem.product_id == p_id,
                SerializedItem.status == ItemStatus.IN_STOCK,
            )
            if v_id is not None:
                q = q.filter(SerializedItem.variant_id == v_id)
            if warehouse_id is not None:
                q = q.filter(SerializedItem.warehouse_id == warehouse_id)
            return int(q.scalar() or 0)
        else:
            q = db.query(func.coalesce(func.sum(BulkWarehouseStock.quantity), 0)).filter(
                BulkWarehouseStock.product_id == p_id,
            )
            if v_id is not None:
                q = q.filter(BulkWarehouseStock.variant_id == v_id)
            if warehouse_id is not None:
                q = q.filter(BulkWarehouseStock.warehouse_id == warehouse_id)
            return int(q.scalar() or 0)

    # 1. First, check if this barcode / serial number already exists in SerializedItem!
    serial_item = (
        db.query(SerializedItem)
        .filter((SerializedItem.barcode == barcode_clean) | (SerializedItem.serial_number == barcode_clean))
        .first()
    )

    if serial_item:
        product = db.query(Product).filter(Product.id == serial_item.product_id).first()
        variant = db.query(ProductVariant).filter(ProductVariant.id == serial_item.variant_id).first() if serial_item.variant_id else None
        wh = db.query(Warehouse).filter(Warehouse.id == serial_item.warehouse_id).first() if serial_item.warehouse_id else None
        wh_name = wh.name if wh else "Unassigned / None"
        status_val = serial_item.status.value if hasattr(serial_item.status, "value") else str(serial_item.status)

        # ─── IF STOCK IN: Check if already assigned or stocked in! ─────────────
        if purpose == "stock_in":
            return {
                "found": True,
                "already_exists": True,
                "is_duplicate": True,
                "type": "serial_duplicate",
                "product_id": serial_item.product_id,
                "product_name": product.name if product else None,
                "product_code": product.product_code if product else None,
                "variant_id": serial_item.variant_id,
                "variant_name": variant.name if variant else None,
                "variant_sku": variant.sku if variant else None,
                "serial_number": serial_item.serial_number,
                "barcode": serial_item.barcode or barcode_clean,
                "assigned_warehouse_id": serial_item.warehouse_id,
                "assigned_warehouse_name": wh_name,
                "item_status": status_val,
                "warning": f"This barcode ({barcode_clean}) is already assigned to '{wh_name}' warehouse (Status: {status_val}). Duplicate stock in is not allowed for the same barcode.",
            }

        # ─── IF STOCK OUT: Check source warehouse and stock status ────────────
        if purpose == "stock_out":
            if warehouse_id and serial_item.warehouse_id != warehouse_id:
                return {
                    "found": True,
                    "is_error": True,
                    "type": "wrong_warehouse",
                    "product_name": product.name if product else None,
                    "assigned_warehouse_name": wh_name,
                    "item_status": status_val,
                    "error": f"Item is currently in '{wh_name}' warehouse, not in the selected warehouse.",
                    "available_stock": 0,
                }
            if serial_item.status != ItemStatus.IN_STOCK:
                return {
                    "found": True,
                    "is_error": True,
                    "type": "not_in_stock",
                    "product_name": product.name if product else None,
                    "assigned_warehouse_name": wh_name,
                    "item_status": status_val,
                    "error": f"Item status is currently '{status_val}'. It cannot be stocked out.",
                    "available_stock": 0,
                }
            return {
                "found": True,
                "type": "serialized_item",
                "item_status": status_val,
                "warehouse_id": serial_item.warehouse_id,
                "serial_number": serial_item.serial_number,
                "product_id": serial_item.product_id,
                "product_name": product.name if product else None,
                "product_code": product.product_code if product else None,
                "tracking_type": "serialized",
                "variant_id": serial_item.variant_id,
                "variant_sku": variant.sku if variant else None,
                "variant_name": variant.name if variant else None,
                "barcode": serial_item.barcode or barcode_clean,
                "available_stock": 1,
            }

        # General lookup
        return {
            "found": True,
            "type": "serialized_item",
            "item_status": status_val,
            "warehouse_id": serial_item.warehouse_id,
            "serial_number": serial_item.serial_number,
            "product_id": serial_item.product_id,
            "product_name": product.name if product else None,
            "product_code": product.product_code if product else None,
            "tracking_type": "serialized",
            "variant_id": serial_item.variant_id,
            "variant_sku": variant.sku if variant else None,
            "variant_name": variant.name if variant else None,
            "barcode": serial_item.barcode or barcode_clean,
            "assigned_warehouse_name": wh_name,
            "available_stock": _get_stock(product.id, serial_item.variant_id, True) if product else 0,
        }

    # 2. Check ProductVariant barcode or SKU
    variant = (
        db.query(ProductVariant)
        .filter((ProductVariant.barcode == barcode_clean) | (ProductVariant.sku == barcode_clean))
        .first()
    )
    if variant:
        product = db.query(Product).filter(Product.id == variant.product_id).first()
        is_ser = product.tracking_type.value == "serialized" if (product and hasattr(product.tracking_type, "value")) else False
        return {
            "found": True,
            "type": "variant",
            "product_id": product.id if product else None,
            "product_name": product.name if product else None,
            "product_code": product.product_code if product else None,
            "tracking_type": product.tracking_type.value if product else "bulk",
            "variant_id": variant.id,
            "variant_sku": variant.sku,
            "variant_name": variant.name,
            "barcode": variant.barcode or barcode_clean,
            "available_stock": _get_stock(product.id, variant.id, is_ser) if product else 0,
        }

    # 3. Check by Product.product_code
    product = (
        db.query(Product)
        .filter(Product.product_code == barcode_clean)
        .first()
    )
    if product:
        first_variant = product.variants[0] if product.variants else None
        is_ser = product.tracking_type.value == "serialized" if hasattr(product.tracking_type, "value") else False
        v_id = first_variant.id if first_variant else None
        return {
            "found": True,
            "type": "variant" if first_variant else "product",
            "product_id": product.id,
            "product_name": product.name,
            "product_code": product.product_code,
            "tracking_type": product.tracking_type.value if hasattr(product.tracking_type, "value") else str(product.tracking_type),
            "variant_id": v_id,
            "variant_sku": first_variant.sku if first_variant else None,
            "variant_name": first_variant.name if first_variant else None,
            "barcode": (first_variant.barcode if first_variant else None) or barcode_clean,
            "available_stock": _get_stock(product.id, v_id, is_ser),
        }

    # 4. Not found
    raise HTTPException(
        status_code=http_status.HTTP_404_NOT_FOUND,
        detail=f"No product variant or existing item found for barcode '{barcode}'. Please create the product/variant first.",
    )


@router.get("/products/{product_id}/variants-stock", summary="Get stocked-in variants breakdown for a product")
def get_product_variants_stock(
    product_id: int,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns a list of all variants of the product, with:
    - variant_id, variant_name, sku, barcode
    - total_stocked_in: total units received (via inbound movements)
    - current_stock: available units in stock
    - tracking_type: serialized vs bulk
    - is_stocked_in: True if total_stocked_in > 0 or current_stock > 0
    """
    from app.models.product import Product, ProductVariant
    from app.models.inventory import StockMovement, SerializedItem, ItemStatus, BulkWarehouseStock
    from app.core.warehouse_access import is_admin_user, get_user_assigned_warehouse_ids, can_user_access_variant
    from sqlalchemy import func
    from fastapi import HTTPException, status as http_status

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Product not found")

    admin = is_admin_user(current_user)
    allowed_wh_ids = None if admin else get_user_assigned_warehouse_ids(db, current_user)

    if not admin and warehouse_id is not None and warehouse_id not in (allowed_wh_ids or []):
        return []

    is_serialized = product.tracking_type.value == "serialized" if hasattr(product.tracking_type, "value") else product.tracking_type == "serialized"
    all_variants = db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()
    variants = [v for v in all_variants if can_user_access_variant(db, current_user, v.id)]

    inbound_types = ["purchase_in", "transfer_in", "adjustment_in", "return_in", "service_in", "replace_in"]

    result = []
    
    if variants:
        for v in variants:
            # 1. Total stocked in for this variant
            mov_q = db.query(func.coalesce(func.sum(StockMovement.quantity), 0)).filter(
                StockMovement.product_id == product_id,
                StockMovement.variant_id == v.id,
                StockMovement.movement_type.in_(inbound_types),
            )
            if warehouse_id is not None:
                mov_q = mov_q.filter(StockMovement.to_warehouse_id == warehouse_id)
            elif allowed_wh_ids is not None:
                mov_q = mov_q.filter(StockMovement.to_warehouse_id.in_(allowed_wh_ids))
            total_stocked_in = int(mov_q.scalar() or 0)

            # 2. Current available stock
            if is_serialized:
                si_q = db.query(func.count(SerializedItem.id)).filter(
                    SerializedItem.product_id == product_id,
                    SerializedItem.variant_id == v.id,
                    SerializedItem.status == ItemStatus.IN_STOCK,
                )
                if warehouse_id is not None:
                    si_q = si_q.filter(SerializedItem.warehouse_id == warehouse_id)
                elif allowed_wh_ids is not None:
                    si_q = si_q.filter(SerializedItem.warehouse_id.in_(allowed_wh_ids))
                current_stock = int(si_q.scalar() or 0)
            else:
                bulk_q = db.query(func.coalesce(func.sum(BulkWarehouseStock.quantity), 0)).filter(
                    BulkWarehouseStock.product_id == product_id,
                    BulkWarehouseStock.variant_id == v.id,
                )
                if warehouse_id is not None:
                    bulk_q = bulk_q.filter(BulkWarehouseStock.warehouse_id == warehouse_id)
                elif allowed_wh_ids is not None:
                    bulk_q = bulk_q.filter(BulkWarehouseStock.warehouse_id.in_(allowed_wh_ids))
                current_stock = int(bulk_q.scalar() or 0)

            result.append({
                "variant_id": v.id,
                "variant_name": v.name or "Standard",
                "sku": v.sku or "—",
                "barcode": v.barcode or "—",
                "tracking_type": "serialized" if is_serialized else "bulk",
                "total_stocked_in": total_stocked_in,
                "current_stock": current_stock,
                "is_stocked_in": total_stocked_in > 0 or current_stock > 0,
            })
    else:
        mov_q = db.query(func.coalesce(func.sum(StockMovement.quantity), 0)).filter(
            StockMovement.product_id == product_id,
            StockMovement.movement_type.in_(inbound_types),
        )
        if warehouse_id:
            mov_q = mov_q.filter(StockMovement.to_warehouse_id == warehouse_id)
        total_stocked_in = int(mov_q.scalar() or 0)

        if is_serialized:
            si_q = db.query(func.count(SerializedItem.id)).filter(
                SerializedItem.product_id == product_id,
                SerializedItem.status == ItemStatus.IN_STOCK,
            )
            if warehouse_id:
                si_q = si_q.filter(SerializedItem.warehouse_id == warehouse_id)
            current_stock = int(si_q.scalar() or 0)
        else:
            bulk_q = db.query(func.coalesce(func.sum(BulkWarehouseStock.quantity), 0)).filter(
                BulkWarehouseStock.product_id == product_id,
            )
            if warehouse_id:
                bulk_q = bulk_q.filter(BulkWarehouseStock.warehouse_id == warehouse_id)
            current_stock = int(bulk_q.scalar() or 0)

        result.append({
            "variant_id": None,
            "variant_name": product.name,
            "sku": product.product_code or "—",
            "barcode": "—",
            "tracking_type": "serialized" if is_serialized else "bulk",
            "total_stocked_in": total_stocked_in,
            "current_stock": current_stock,
            "is_stocked_in": total_stocked_in > 0 or current_stock > 0,
        })

    return {
        "product_id": product.id,
        "product_name": product.name,
        "product_code": product.product_code,
        "tracking_type": "serialized" if is_serialized else "bulk",
        "variants": result,
    }


@router.get("/lookup-item", summary="Lookup item by barcode, serial, or SKU")
def lookup_item(
    code: str,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search and verify whether a product/serialized unit exists by barcode or serial number,
    and checks if it is available in the specified warehouse.
    """
    return InventoryController.lookup_item(db, code, warehouse_id)


@router.get("/tracking", summary="Track product warehouse distribution by barcode")
def track_product_by_barcode(
    barcode: str = Query(..., min_length=1, description="Barcode or serial number to track"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tracking_read")),
):
    """
    Global Product Tracking by Barcode.
    Searches across ALL warehouses without any filter restriction,
    showing in which warehouses the product is located and unit counts.
    """
    from app.models.product import Product, ProductVariant
    from app.models.warehouse import Warehouse
    from app.models.inventory import SerializedItem, ItemStatus, BulkWarehouseStock, StockMovement
    from sqlalchemy import func, or_

    clean_barcode = barcode.strip()
    if not clean_barcode:
        return {"found": False, "query_barcode": barcode, "message": "Barcode cannot be empty"}

    # 1. Search in SerializedItem (exact serial or unit barcode)
    serial_item = (
        db.query(SerializedItem)
        .filter(or_(SerializedItem.barcode == clean_barcode, SerializedItem.serial_number == clean_barcode))
        .first()
    )

    matched_product = None
    matched_variant = None
    exact_item_info = None
    match_type = None

    if serial_item:
        matched_product = db.query(Product).filter(Product.id == serial_item.product_id).first()
        matched_variant = db.query(ProductVariant).filter(ProductVariant.id == serial_item.variant_id).first() if serial_item.variant_id else None
        match_type = "serialized_item"
        wh = db.query(Warehouse).filter(Warehouse.id == serial_item.warehouse_id).first() if serial_item.warehouse_id else None
        exact_item_info = {
            "id": serial_item.id,
            "serial_number": serial_item.serial_number,
            "barcode": serial_item.barcode or clean_barcode,
            "status": serial_item.status.value if hasattr(serial_item.status, "value") else str(serial_item.status),
            "warehouse_id": serial_item.warehouse_id,
            "warehouse_name": wh.name if wh else "Unassigned / Not in warehouse",
            "warehouse_code": wh.code if wh else None,
            "warranty_start": serial_item.warranty_start.isoformat() if serial_item.warranty_start else None,
            "warranty_end": serial_item.warranty_end.isoformat() if serial_item.warranty_end else None,
        }

    # 2. Check ProductVariant (variant barcode or sku)
    if not matched_product:
        variant = (
            db.query(ProductVariant)
            .filter(or_(ProductVariant.barcode == clean_barcode, ProductVariant.sku == clean_barcode))
            .first()
        )
        if variant:
            matched_variant = variant
            matched_product = db.query(Product).filter(Product.id == variant.product_id).first()
            match_type = "variant"

    # 3. Check Product.product_code
    if not matched_product:
        product = db.query(Product).filter(Product.product_code == clean_barcode).first()
        if product:
            matched_product = product
            match_type = "product"
            if product.variants and len(product.variants) == 1:
                matched_variant = product.variants[0]

    # If still not found:
    if not matched_product:
        return {
            "found": False,
            "query_barcode": clean_barcode,
            "message": f"No product, variant, or item found matching '{clean_barcode}'.",
        }

    is_serialized = (
        matched_product.tracking_type.value == "serialized"
        if hasattr(matched_product.tracking_type, "value")
        else matched_product.tracking_type == "serialized"
    )

    all_warehouses = db.query(Warehouse).order_by(Warehouse.name.asc()).all()
    warehouse_results = []
    total_in_stock_all = 0
    total_units_all = 0

    target_variant_id = matched_variant.id if matched_variant else None

    for wh in all_warehouses:
        wh_units = 0
        wh_in_stock = 0
        wh_other_status = 0
        wh_items_list = []

        if is_serialized:
            si_query = db.query(SerializedItem).filter(
                SerializedItem.product_id == matched_product.id,
                SerializedItem.warehouse_id == wh.id,
            )
            if target_variant_id is not None:
                si_query = si_query.filter(
                    or_(
                        SerializedItem.variant_id == target_variant_id,
                        SerializedItem.barcode == clean_barcode,
                    )
                )

            si_items = si_query.all()
            wh_units = len(si_items)
            wh_in_stock = sum(1 for it in si_items if it.status == ItemStatus.IN_STOCK)
            wh_other_status = wh_units - wh_in_stock

            for it in si_items[:50]:
                wh_items_list.append({
                    "id": it.id,
                    "serial_number": it.serial_number,
                    "barcode": it.barcode or it.serial_number,
                    "status": it.status.value if hasattr(it.status, "value") else str(it.status),
                    "warranty_end": it.warranty_end.isoformat() if it.warranty_end else None,
                })
        else:
            bulk_q = db.query(func.coalesce(func.sum(BulkWarehouseStock.quantity), 0)).filter(
                BulkWarehouseStock.product_id == matched_product.id,
                BulkWarehouseStock.warehouse_id == wh.id,
            )
            if target_variant_id is not None:
                bulk_q = bulk_q.filter(BulkWarehouseStock.variant_id == target_variant_id)
            qty = int(bulk_q.scalar() or 0)
            wh_units = qty
            wh_in_stock = qty

        if wh_units > 0:
            warehouse_results.append({
                "warehouse_id": wh.id,
                "warehouse_name": wh.name,
                "warehouse_code": wh.code,
                "address": wh.address,
                "total_units": wh_units,
                "in_stock_units": wh_in_stock,
                "other_status_units": wh_other_status,
                "items": wh_items_list,
            })
            total_units_all += wh_units
            total_in_stock_all += wh_in_stock

    # Unassigned stock (warehouse_id is NULL)
    unassigned_count = 0
    unassigned_items = []
    if is_serialized:
        unassigned_q = db.query(SerializedItem).filter(
            SerializedItem.product_id == matched_product.id,
            SerializedItem.warehouse_id.is_(None),
        )
        if target_variant_id is not None:
            unassigned_q = unassigned_q.filter(
                or_(
                    SerializedItem.variant_id == target_variant_id,
                    SerializedItem.barcode == clean_barcode,
                )
            )
        un_items = unassigned_q.all()
        unassigned_count = len(un_items)
        for it in un_items[:50]:
            unassigned_items.append({
                "id": it.id,
                "serial_number": it.serial_number,
                "barcode": it.barcode or it.serial_number,
                "status": it.status.value if hasattr(it.status, "value") else str(it.status),
            })
        total_units_all += unassigned_count

    # Recent Movements
    recent_movs_q = (
        db.query(StockMovement)
        .filter(StockMovement.product_id == matched_product.id)
    )
    if target_variant_id is not None:
        recent_movs_q = recent_movs_q.filter(StockMovement.variant_id == target_variant_id)
    if serial_item:
        recent_movs_q = recent_movs_q.filter(
            or_(
                StockMovement.product_item_id == serial_item.id,
                StockMovement.variant_id == target_variant_id,
            )
        )

    recent_movements = []
    for m in recent_movs_q.order_by(StockMovement.id.desc()).limit(8).all():
        from_wh_name = None
        to_wh_name = None
        if m.from_warehouse_id:
            w = db.query(Warehouse.name).filter(Warehouse.id == m.from_warehouse_id).first()
            from_wh_name = w[0] if w else None
        if m.to_warehouse_id:
            w = db.query(Warehouse.name).filter(Warehouse.id == m.to_warehouse_id).first()
            to_wh_name = w[0] if w else None

        recent_movements.append({
            "id": m.id,
            "movement_type": m.movement_type.value if hasattr(m.movement_type, "value") else str(m.movement_type),
            "quantity": m.quantity,
            "from_warehouse": from_wh_name,
            "to_warehouse": to_wh_name,
            "note": m.note,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return {
        "found": True,
        "query_barcode": clean_barcode,
        "match_type": match_type,
        "product": {
            "id": matched_product.id,
            "name": matched_product.name,
            "product_code": matched_product.product_code,
            "tracking_type": matched_product.tracking_type.value if hasattr(matched_product.tracking_type, "value") else str(matched_product.tracking_type),
            "category_name": matched_product.category.name if matched_product.category else None,
            "status": matched_product.status.value if hasattr(matched_product.status, "value") else str(matched_product.status),
        },
        "variant": {
            "id": matched_variant.id,
            "name": matched_variant.name,
            "sku": matched_variant.sku,
            "barcode": matched_variant.barcode,
            "cost_price": float(matched_variant.cost_price or 0.0),
            "selling_price": float(matched_variant.selling_price or 0.0),
            "status": matched_variant.status.value if hasattr(matched_variant.status, "value") else str(matched_variant.status),
        } if matched_variant else None,
        "exact_item": exact_item_info,
        "total_units": total_units_all,
        "total_in_stock": total_in_stock_all,
        "warehouses_count": len(warehouse_results),
        "warehouses": warehouse_results,
        "unassigned_stock": {
            "total_units": unassigned_count,
            "items": unassigned_items,
        },
        "recent_movements": recent_movements,
    }