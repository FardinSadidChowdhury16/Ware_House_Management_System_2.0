from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission
from app.core.warehouse_access import resolve_warehouse_scope, is_admin_user
from app.modules.warehouses.warehouses_controller import WarehouseController
from app.schemas.warehouse import WarehouseCreate, WarehouseResponse, WarehouseUpdate

router = APIRouter()


@router.get("/my-warehouses", summary="Get warehouses assigned to the current user")
def get_my_warehouses(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns the list of active warehouses assigned to the logged-in user (all active for admins)."""
    from app.models.warehouse import Warehouse
    from app.models.access_control import User

    user = db.query(User).filter(User.id == current_user.id).first()
    admin = is_admin_user(user)
    if admin:
        warehouses = db.query(Warehouse).filter(Warehouse.status == True).all()
    else:
        warehouses = [w for w in (user.warehouses or []) if w.status] if user else []

    return [
        {"id": w.id, "name": w.name, "code": w.code, "status": w.status}
        for w in warehouses
    ]


@router.get("/my-summary", summary="Dashboard summary scoped to the current user's warehouses")
def get_my_warehouse_summary(
    warehouse_id: Optional[int] = Query(None, description="Filter to a specific assigned warehouse"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns 3 summary KPIs for the current user's assigned warehouses:
    - total_stock_units: serialized IN_STOCK + bulk quantity
    - pending_approvals: PENDING approvals for those warehouses
    - under_repair: serialized items with status UNDER_SERVICE in those warehouses
    Optionally filtered to a single warehouse via ?warehouse_id=
    """
    from app.models.warehouse import Warehouse
    from app.models.access_control import User
    from app.models.inventory import SerializedItem, BulkWarehouseStock, ItemStatus
    from app.models.approval import StockApproval, ApprovalStatus

    # Resolve the user's assigned warehouse IDs
    user = db.query(User).filter(User.id == current_user.id).first()
    admin = is_admin_user(user)
    if admin:
        all_whs = db.query(Warehouse).filter(Warehouse.status == True).all()
        assigned_wh_ids = [w.id for w in all_whs]
    else:
        assigned_wh_ids = [w.id for w in user.warehouses if w.status] if user and user.warehouses else []

    # If a specific warehouse_id is requested, validate it belongs to the user
    if warehouse_id is not None:
        if warehouse_id in assigned_wh_ids:
            target_ids = [warehouse_id]
        else:
            target_ids = []  # not assigned → return zeros
    else:
        target_ids = assigned_wh_ids

    if not target_ids:
        return {
            "total_stock_units": 0,
            "pending_approvals": 0,
            "under_repair": 0,
            "warehouses": [],
        }

    # 1. Total stock units
    serialized_count = (
        db.query(func.count(SerializedItem.id))
        .filter(
            SerializedItem.warehouse_id.in_(target_ids),
            SerializedItem.status == ItemStatus.IN_STOCK,
        )
        .scalar() or 0
    )
    bulk_total = (
        db.query(func.coalesce(func.sum(BulkWarehouseStock.quantity), 0))
        .filter(BulkWarehouseStock.warehouse_id.in_(target_ids))
        .scalar() or 0
    )
    total_stock_units = int(serialized_count) + int(bulk_total)

    # 2. Pending approvals linked to those warehouses
    pending_approvals = (
        db.query(func.count(StockApproval.id))
        .filter(
            StockApproval.status == ApprovalStatus.PENDING,
            StockApproval.warehouse_id.in_(target_ids),
        )
        .scalar() or 0
    )

    # 3. Under repair (serialized items with UNDER_SERVICE status)
    under_repair = (
        db.query(func.count(SerializedItem.id))
        .filter(
            SerializedItem.warehouse_id.in_(target_ids),
            SerializedItem.status == ItemStatus.UNDER_SERVICE,
        )
        .scalar() or 0
    )

    # Warehouse list for dropdown
    warehouses = (
        db.query(Warehouse)
        .filter(Warehouse.id.in_(assigned_wh_ids))
        .all()
    )

    return {
        "total_stock_units": total_stock_units,
        "pending_approvals": int(pending_approvals),
        "under_repair": int(under_repair),
        "warehouses": [
            {"id": w.id, "name": w.name, "code": w.code}
            for w in warehouses
        ],
    }


# ── List: non-admin sees only their assigned warehouses; all_active returns all active warehouses ──
@router.get("", response_model=List[WarehouseResponse])
def get_warehouses(
    skip: int = 0,
    limit: int = 100,
    all_active: bool = Query(False, description="If true, return all active warehouses"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.models.warehouse import Warehouse

    if all_active:
        return db.query(Warehouse).filter(Warehouse.status == True).offset(skip).limit(limit).all()

    allowed, target_ids = resolve_warehouse_scope(db, current_user)
    if not allowed:
        return []
    controller = WarehouseController(db)
    return controller.get_warehouses(skip=skip, limit=limit, allowed_warehouse_ids=target_ids)


# ── Create: requires warehouse_write ─────────────────────────────────────────
@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    warehouse_in: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("warehouse_write")),
):
    controller = WarehouseController(db)
    return controller.create_warehouse(warehouse_in)


# ── Get by ID: scoped to assigned warehouses ─────────────────────────────────
@router.get("/{id}", response_model=WarehouseResponse)
def get_warehouse(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("warehouse_read")),
):
    allowed, _ = resolve_warehouse_scope(db, current_user, requested_warehouse_id=id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied: You are not assigned to this warehouse.")
    controller = WarehouseController(db)
    return controller.get_warehouse(id)


# ── Update: requires warehouse_write ─────────────────────────────────────────
@router.put("/{id}", response_model=WarehouseResponse)
def update_warehouse(
    id: int,
    warehouse_in: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("warehouse_write")),
):
    controller = WarehouseController(db)
    return controller.update_warehouse(id, warehouse_in)


# ── Toggle status: requires warehouse_write ──────────────────────────────────
@router.patch("/{id}/toggle-status", response_model=WarehouseResponse)
def toggle_warehouse_status(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("warehouse_write")),
):
    controller = WarehouseController(db)
    return controller.toggle_status(id)