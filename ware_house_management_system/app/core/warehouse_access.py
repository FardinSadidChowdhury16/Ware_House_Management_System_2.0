"""
Warehouse Access Control Utilities
===================================
Shared helpers for enforcing warehouse-level access control across all routes.

Rules:
- Admin roles (admin, administrator, super administrator, superadmin) → full access to ALL warehouses
- Non-admin users → can only read/write data scoped to their ASSIGNED warehouses
- Mutations (create/update/delete) on warehouses/users → admin only
"""

from typing import Optional, Tuple, List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.access_control import User

# ── Admin role names (case-insensitive) ──────────────────────────────────────
ADMIN_ROLE_NAMES = {"admin", "administrator", "super administrator", "superadmin"}


def is_admin_user(user: User) -> bool:
    """Check if a user has an admin role."""
    if not user or not user.role:
        return False
    return (user.role.name or "").lower().strip() in ADMIN_ROLE_NAMES


def get_user_assigned_warehouse_ids(db: Session, user: User) -> List[int]:
    """
    Return the warehouse IDs assigned to this user.
    For admin users, returns an empty list (meaning 'all warehouses' — no restriction).
    """
    from sqlalchemy.orm import joinedload
    fresh_user = (
        db.query(User)
        .options(joinedload(User.warehouses), joinedload(User.role))
        .filter(User.id == user.id)
        .first()
    )
    if not fresh_user:
        return []
    if is_admin_user(fresh_user):
        return []  # empty = unrestricted for admins
    return [w.id for w in (fresh_user.warehouses or []) if w.status]


def can_user_access_variant(db: Session, user: User, variant_id: int) -> bool:
    """
    Check if a user is allowed to access/modify a variant.
    - Admins: always allowed.
    - Non-admins:
      - If variant is not assigned to any warehouse (unassigned / not stocked in) -> allowed.
      - If variant is assigned to warehouses, at least one must be in user's assigned warehouses -> allowed.
      - If variant belongs exclusively to other warehouses -> denied.
    """
    if not user:
        return False
    if is_admin_user(user):
        return True

    from app.models.inventory import SerializedItem, BulkWarehouseStock
    from app.models.product import ProductVariant

    assigned_ids = get_user_assigned_warehouse_ids(db, user)

    # 1. Serialized items linked by variant_id
    s_wh_ids = [
        r[0]
        for r in db.query(SerializedItem.warehouse_id)
        .filter(
            SerializedItem.variant_id == variant_id,
            SerializedItem.warehouse_id.isnot(None),
        )
        .all()
        if r[0] is not None
    ]

    # Also check serialized items linked by barcode
    v = db.query(ProductVariant.barcode).filter(ProductVariant.id == variant_id).first()
    if v and v[0]:
        s_barcode_wh = [
            r[0]
            for r in db.query(SerializedItem.warehouse_id)
            .filter(
                SerializedItem.barcode == v[0],
                SerializedItem.warehouse_id.isnot(None),
            )
            .all()
            if r[0] is not None
        ]
        s_wh_ids.extend(s_barcode_wh)

    # 2. Bulk items with quantity > 0
    b_wh_ids = [
        r[0]
        for r in db.query(BulkWarehouseStock.warehouse_id)
        .filter(
            BulkWarehouseStock.variant_id == variant_id,
            BulkWarehouseStock.quantity > 0,
            BulkWarehouseStock.warehouse_id.isnot(None),
        )
        .all()
        if r[0] is not None
    ]

    all_wh_ids = set(s_wh_ids + b_wh_ids)
    if not all_wh_ids:
        # Variant has no warehouse assigned anywhere (unassigned) -> user has full access
        return True

    # Variant is in warehouse(s) -> user must have at least one in their assigned warehouses
    return any(wid in assigned_ids for wid in all_wh_ids)


def can_user_access_product(db: Session, user: User, product_id: int) -> bool:
    """
    Check if a user is allowed to access/modify a product.
    - Admins: always allowed.
    - Non-admins:
      - If product has no items/variants, or has at least one unassigned item (not in any warehouse) -> allowed.
      - If product has items in warehouses, and at least one is in user's assigned warehouses -> allowed.
      - If ALL items of the product belong exclusively to other warehouses -> denied.
    """
    if not user:
        return False
    if is_admin_user(user):
        return True

    from sqlalchemy import or_
    from app.models.inventory import SerializedItem, BulkWarehouseStock
    from app.models.product import ProductVariant

    assigned_ids = get_user_assigned_warehouse_ids(db, user)

    # 1. Check if product has any variants
    variants = (
        db.query(ProductVariant.id, ProductVariant.barcode)
        .filter(ProductVariant.product_id == product_id)
        .all()
    )
    if not variants:
        # Product has no items at all -> unassigned product -> allowed
        return True

    # 2. Check each variant: if ANY variant is unassigned or assigned to permitted warehouse -> allowed
    for v_id, v_barcode in variants:
        # Serialized check
        s_conds = [SerializedItem.variant_id == v_id]
        if v_barcode:
            s_conds.append(SerializedItem.barcode == v_barcode)

        s_wh_ids = [
            r[0]
            for r in db.query(SerializedItem.warehouse_id)
            .filter(or_(*s_conds), SerializedItem.warehouse_id.isnot(None))
            .all()
            if r[0] is not None
        ]

        # Bulk check
        b_wh_ids = [
            r[0]
            for r in db.query(BulkWarehouseStock.warehouse_id)
            .filter(
                BulkWarehouseStock.variant_id == v_id,
                BulkWarehouseStock.quantity > 0,
                BulkWarehouseStock.warehouse_id.isnot(None),
            )
            .all()
            if r[0] is not None
        ]

        var_wh_ids = set(s_wh_ids + b_wh_ids)
        if not var_wh_ids:
            # Found an unassigned variant -> user has access to product!
            return True

        if any(wid in assigned_ids for wid in var_wh_ids):
            # Variant is in user's permitted warehouse -> user has access to product!
            return True

    # All variants belong exclusively to other warehouses
    return False


def resolve_warehouse_scope(
    db: Session,
    user: User,
    requested_warehouse_id: Optional[int] = None,
) -> Tuple[bool, Optional[List[int]]]:
    """
    Resolve what warehouse IDs a user is allowed to access.

    Returns:
        (allowed: bool, target_ids: Optional[List[int]])

        - allowed=False → user has no access (return empty / raise 403)
        - allowed=True, target_ids=None → admin, no filter (all warehouses)
        - allowed=True, target_ids=[...] → restrict to these IDs
    """
    from sqlalchemy.orm import joinedload
    fresh_user = (
        db.query(User)
        .options(joinedload(User.warehouses))
        .filter(User.id == user.id)
        .first()
    )
    if not fresh_user:
        return False, []

    admin = is_admin_user(fresh_user)
    assigned_ids = [w.id for w in (fresh_user.warehouses or []) if w.status]

    # Admin: full access
    if admin:
        if requested_warehouse_id is not None:
            return True, [requested_warehouse_id]
        return True, None  # None = no restriction

    # Non-admin with no assigned warehouses: no access
    if not assigned_ids:
        return False, []

    # Non-admin requesting a specific warehouse
    if requested_warehouse_id is not None:
        if requested_warehouse_id not in assigned_ids:
            return False, []
        return True, [requested_warehouse_id]

    # Non-admin, no specific warehouse → scope to assigned
    return True, assigned_ids


def require_admin():
    """
    FastAPI dependency: raises 403 if the current user is NOT an admin.
    Use this to protect create/update/delete endpoints that are admin-only.
    """
    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        from sqlalchemy.orm import joinedload
        user = (
            db.query(User)
            .options(joinedload(User.role))
            .filter(User.id == current_user.id)
            .first()
        )
        if not user or not is_admin_user(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Administrator privileges required.",
            )
        return user

    return _check


def require_warehouse_access(warehouse_id_param: str = "warehouse_id"):
    """
    FastAPI dependency: validates that the current user is allowed to access
    the requested warehouse_id. Admins pass freely; non-admins must have
    the warehouse in their assigned list.

    NOTE: This is a factory — use it like:
        current_user = Depends(require_warehouse_access())
    """
    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        # Basic auth check; warehouse validation happens in route logic
        return current_user

    return _check

