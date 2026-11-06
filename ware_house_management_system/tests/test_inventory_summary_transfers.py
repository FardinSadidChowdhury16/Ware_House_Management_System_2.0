import pytest
from unittest.mock import MagicMock
from app.modules.inventory.inventory_service import InventoryService
from app.models.warehouse import Warehouse
from app.models.product import Product, ProductVariant
from app.models.inventory import SerializedItem, BulkWarehouseStock, ItemStatus, MovementType


def test_get_warehouse_stock_summary_with_transfers():
    db = MagicMock()
    service = InventoryService(db)

    # 1. Warehouse
    wh1 = MagicMock(spec=Warehouse)
    wh1.id = 1
    wh1.name = "Central Warehouse"
    wh1.code = "WH-CENTRAL"
    wh1.address = "Dhaka"

    # 2. Product
    prod = MagicMock(spec=Product)
    prod.id = 10
    prod.name = "Smart Router"
    prod.product_code = "SR-100"
    prod.category = None
    prod.tracking_type = "serialized"

    # 3. Serialized Item in stock
    si = MagicMock(spec=SerializedItem)
    si.id = 101
    si.product_id = 10
    si.variant_id = 1
    si.warehouse_id = 1
    si.serial_number = "SN-001"
    si.barcode = "BC-001"
    si.status = ItemStatus.IN_STOCK
    si.warranty_start = None
    si.warranty_end = None

    # Variants
    var = MagicMock(spec=ProductVariant)
    var.id = 1
    var.name = "Standard"

    # We mock db.query to return our mocked models
    def mock_query(model, *args, **kwargs):
        mock_q = MagicMock()
        if model is Warehouse:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = [wh1]
        elif model is Product:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = [prod]
        elif model is ProductVariant:
            mock_q.all.return_value = [var]
        elif model is SerializedItem:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = [si]
        elif model is BulkWarehouseStock:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = []
        else:
            # StockMovement aggregations or ServiceTicket queries
            mock_q.filter.return_value = mock_q
            mock_q.group_by.return_value = mock_q
            mock_q.all.return_value = []
        return mock_q

    db.query.side_effect = mock_query

    res = service.get_warehouse_stock_summary(warehouse_id=1)

    assert "summary" in res
    assert "items" in res
    assert res["summary"]["total_in_stock"] >= 1
    assert "total_transfer_in" in res["summary"]
    assert "total_transfer_out" in res["summary"]
    assert "total_transfers" in res["summary"]
    assert "total_stock_in" in res["summary"]
    assert "total_stock_out" in res["summary"]

    if len(res["items"]) > 0:
        item = res["items"][0]
        assert "transfer_in_qty" in item
        assert "transfer_out_qty" in item
        assert "transfer_qty" in item
        assert "stock_in_qty" in item
        assert "stock_out_qty" in item


def test_get_warehouse_stock_summary_exact_calculations():
    db = MagicMock()
    service = InventoryService(db)

    wh1 = MagicMock(spec=Warehouse)
    wh1.id = 1
    wh1.name = "Central Warehouse"
    wh1.code = "WH-CENTRAL"
    wh1.address = "Dhaka"

    prod = MagicMock(spec=Product)
    prod.id = 10
    prod.name = "Smart Router"
    prod.product_code = "SR-100"
    prod.category = None
    prod.tracking_type = "serialized"

    var = MagicMock(spec=ProductVariant)
    var.id = 1
    var.name = "Standard"

    # Query counts
    call_idx = 0

    def mock_query(*args, **kwargs):
        mock_q = MagicMock()
        first_arg = args[0] if args else None

        if first_arg is Warehouse:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = [wh1]
        elif first_arg is Product:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = [prod]
        elif first_arg is ProductVariant:
            mock_q.all.return_value = [var]
        elif first_arg is SerializedItem:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = []
        elif first_arg is BulkWarehouseStock:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = []
        else:
            mock_q.filter.return_value = mock_q
            mock_q.group_by.return_value = mock_q
            return mock_q
        return mock_q

    # We mock specific query calls for StockMovement queries:
    # 1. stock_in_query -> [(10, 1, 10)] (10 units purchased in)
    # 2. transfer_in_query -> [(10, 1, 5)] (5 units transferred in)
    # 3. stock_out_query -> [(10, 1, 3)] (3 units sold out)
    # 4. transfer_out_query -> [(10, 1, 2)] (2 units transferred out)
    # 5. customer_out_query -> [(10, 1, 3)] (3 units to customers)
    # 6. srv_ticket_query -> [] (0 tickets)

    mock_db = MagicMock()
    mock_db.query.side_effect = mock_query

    # Specifically configure the group_by(...).all() calls in order
    group_by_returns = [
        [(10, 1, 10)],  # 1. stock_in_map: 10
        [(10, 1, 5)],   # 2. transfer_in_map: 5
        [(10, 1, 3)],   # 3. stock_out_map: 3
        [(10, 1, 2)],   # 4. transfer_out_map: 2
        [(10, 1, 3)],   # 5. customer_map: 3
        [],              # 6. srv_ticket_map: 0
    ]

    # Create a cycling/sequential return value for group_by().all()
    mock_group_by_q = MagicMock()
    mock_group_by_q.all.side_effect = group_by_returns

    def mock_query_with_group_by(*args, **kwargs):
        first_arg = args[0] if args else None
        mock_q = MagicMock()
        if first_arg is Warehouse:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = [wh1]
            return mock_q
        if first_arg is Product:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = [prod]
            return mock_q
        if first_arg is ProductVariant:
            mock_q.all.return_value = [var]
            return mock_q
        if first_arg is SerializedItem:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = []
            return mock_q
        if first_arg is BulkWarehouseStock:
            mock_q.filter.return_value = mock_q
            mock_q.all.return_value = []
            return mock_q

        mock_q.filter.return_value = mock_q
        mock_q.group_by.return_value = mock_group_by_q
        return mock_q

    mock_db.query.side_effect = mock_query_with_group_by
    svc = InventoryService(mock_db)
    res = svc.get_warehouse_stock_summary(warehouse_id=1)

    assert len(res["items"]) == 1
    item = res["items"][0]
    assert item["stock_in_qty"] == 10
    assert item["transfer_in_qty"] == 5
    assert item["stock_out_qty"] == 3
    assert item["transfer_out_qty"] == 2
    assert item["transfer_qty"] == 7
    assert item["total_received_qty"] == 15

    # Summary
    summary = res["summary"]
    assert summary["total_stock_in"] == 10
    assert summary["total_transfer_in"] == 5
    assert summary["total_stock_out"] == 3
    assert summary["total_transfer_out"] == 2
    assert summary["total_transfers"] == 7
    assert summary["total_received"] == 15
