import pytest
from unittest.mock import MagicMock
from app.core.warehouse_access import (
    can_user_access_product,
    can_user_access_variant,
    is_admin_user,
    get_user_assigned_warehouse_ids,
)
from app.models.access_control import User, Role
from app.models.product import Product, ProductVariant
from app.models.inventory import SerializedItem, BulkWarehouseStock


def test_admin_has_full_access():
    admin_user = MagicMock(spec=User)
    admin_user.role = MagicMock(spec=Role)
    admin_user.role.name = "Administrator"
    admin_user.role.code = "admin"
    admin_user.warehouses = []

    assert is_admin_user(admin_user) is True
    assert can_user_access_product(MagicMock(), admin_user, 999) is True
    assert can_user_access_variant(MagicMock(), admin_user, 999) is True


def test_user_can_access_product_with_no_variants():
    db = MagicMock()
    user = MagicMock(spec=User)
    user.role = MagicMock(spec=Role)
    user.role.name = "Staff"
    user.role.code = "staff"
    user.warehouses = []

    # Product exists, but has no variants
    db.query.return_value.filter.return_value.first.return_value = MagicMock(spec=Product)
    # variant ids query returns empty list
    db.query.return_value.filter.return_value.all.return_value = []

    assert can_user_access_product(db, user, 1) is True


def test_user_can_access_product_with_unassigned_variants():
    db = MagicMock()
    user = MagicMock(spec=User)
    user.role = MagicMock(spec=Role)
    user.role.name = "Staff"
    user.role.code = "staff"
    user.warehouses = []

    mock_db = MagicMock()
    # 1. ProductVariant query returns variant id 10 with barcode 'BC10'
    mock_db.query.return_value.filter.return_value.all.side_effect = [
        [(10, "BC10")],  # variants
        [],               # serialized warehouse ids
        [],               # bulk warehouse ids
    ]

    assert can_user_access_product(mock_db, user, 1) is True


def test_user_denied_product_with_only_other_warehouse_variants():
    db = MagicMock()
    user = MagicMock(spec=User)
    user.role = MagicMock(spec=Role)
    user.role.name = "Staff"
    user.role.code = "staff"
    user_wh = MagicMock()
    user_wh.id = 5
    user.warehouses = [user_wh]

    mock_db = MagicMock()
    # Variant 10 belongs to warehouse 99 (not warehouse 5)
    mock_db.query.return_value.filter.return_value.all.side_effect = [
        [(10, "BC10")],  # variants
        [(99,)],          # serialized warehouse ids = 99
        [],               # bulk warehouse ids
    ]

    assert can_user_access_product(mock_db, user, 1) is False
