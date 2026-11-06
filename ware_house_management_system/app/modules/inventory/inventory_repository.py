from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import String, cast, or_
from app.models.inventory import (
    SerializedItem,
    BulkWarehouseStock,
    StockMovement,
    ItemStatus,
    MovementType,
)
from app.schemas.inventory import SerializedItemCreate, StockMovementCreate


class InventoryRepository:
    def __init__(self, db: Session):
        self.db = db

    # Serialized Items
    def get_serialized_item_by_serial(self, serial_number: str) -> Optional[SerializedItem]:
        return self.db.query(SerializedItem).filter(SerializedItem.serial_number == serial_number).first()

    def create_serialized_item(self, item_in: SerializedItemCreate) -> SerializedItem:
        item = SerializedItem(**item_in.model_dump())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_serialized_items(
        self,
        warehouse_id: Optional[int] = None,
        product_id: Optional[int] = None,
        status: Optional[ItemStatus] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ) -> List[SerializedItem]:
        query = self.db.query(SerializedItem)
        if warehouse_id:
            query = query.filter(SerializedItem.warehouse_id == warehouse_id)
        elif allowed_warehouse_ids is not None:
            query = query.filter(
                or_(
                    SerializedItem.warehouse_id.in_(allowed_warehouse_ids),
                    SerializedItem.warehouse_id.is_(None),
                )
            )
        if product_id:
            query = query.filter(SerializedItem.product_id == product_id)
        if status:
            query = query.filter(SerializedItem.status == status)
        return query.all()

    # Bulk Stock
    def get_bulk_stock(
        self, warehouse_id: Optional[int] = None, product_id: Optional[int] = None, allowed_warehouse_ids: Optional[List[int]] = None
    ) -> List[BulkWarehouseStock]:
        query = self.db.query(BulkWarehouseStock)
        if warehouse_id:
            query = query.filter(BulkWarehouseStock.warehouse_id == warehouse_id)
        elif allowed_warehouse_ids is not None:
            query = query.filter(BulkWarehouseStock.warehouse_id.in_(allowed_warehouse_ids))
        if product_id:
            query = query.filter(BulkWarehouseStock.product_id == product_id)
        return query.all()

    def update_bulk_stock_quantity(
        self, warehouse_id: int, product_id: int, variant_id: Optional[int], qty_change: int
    ) -> BulkWarehouseStock:
        stock = self.db.query(BulkWarehouseStock).filter(
            BulkWarehouseStock.warehouse_id == warehouse_id,
            BulkWarehouseStock.product_id == product_id,
            BulkWarehouseStock.variant_id == variant_id,
        ).first()

        if not stock:
            stock = BulkWarehouseStock(
                warehouse_id=warehouse_id,
                product_id=product_id,
                variant_id=variant_id,
                quantity=0,
            )
            self.db.add(stock)

        if stock.quantity + qty_change < 0:
            raise ValueError(f"Insufficient stock in warehouse {warehouse_id} for product {product_id}: current stock is {stock.quantity}, attempting to deduct {-qty_change}")
        stock.quantity += qty_change
        return stock

    # Movements
    def create_stock_movement(self, movement_in: StockMovementCreate, user_id: int) -> StockMovement:
        movement = StockMovement(**movement_in.model_dump(), created_by=user_id)
        self.db.add(movement)
        return movement
      
    def update_serialized_item_status(self, serial_number: str, new_status: ItemStatus) -> Optional[SerializedItem]:
        item = self.get_serialized_item_by_serial(serial_number)
        if item:
            item.status = new_status
            self.db.add(item)
            return item
        return None
      
      

    def get_movements_paginated(
        self,
        page=1,
        page_size=10,
        warehouse_id=None,
        product_id=None,
        movement_type=None,
        direction=None,
        date_from=None,
        date_to=None,
        search=None,
        allowed_warehouse_ids=None,
    ):
        """Get paginated stock movements with joined product/warehouse/supplier/customer names."""
        from app.models.product import Product, ProductVariant
        from app.models.warehouse import Warehouse
        from app.models.party import Supplier, Customer
        from app.models.warehouse import Warehouse
        from app.models.access_control import User
        
        query = self.db.query(StockMovement)
        
        outbound_enums = [
            MovementType.SALE_OUT,
            MovementType.TRANSFER_OUT,
            MovementType.ADJUSTMENT_OUT,
            MovementType.SERVICE_OUT,
            MovementType.REPLACE_OUT,
        ]
        outbound_strings = [
            "sale_out",
            "transfer_out",
            "adjustment_out",
            "service_out",
            "replace_out",
            "SALE_OUT",
            "TRANSFER_OUT",
            "ADJUSTMENT_OUT",
            "SERVICE_OUT",
            "REPLACE_OUT",
        ]
        OUTBOUND_TYPES = outbound_enums + outbound_strings

        inbound_enums = [
            MovementType.PURCHASE_IN,
            MovementType.TRANSFER_IN,
            MovementType.ADJUSTMENT_IN,
            MovementType.RETURN_IN,
            MovementType.SERVICE_IN,
            MovementType.REPLACE_IN,
        ]
        inbound_strings = [
            "purchase_in",
            "transfer_in",
            "adjustment_in",
            "return_in",
            "service_in",
            "replace_in",
            "PURCHASE_IN",
            "TRANSFER_IN",
            "ADJUSTMENT_IN",
            "RETURN_IN",
            "SERVICE_IN",
            "REPLACE_IN",
        ]
        INBOUND_TYPES = inbound_enums + inbound_strings

        if direction == "out":
            query = query.filter(
                or_(
                    StockMovement.movement_type.in_(OUTBOUND_TYPES),
                    cast(StockMovement.movement_type, String).ilike("%out"),
                    cast(StockMovement.movement_type, String).in_(outbound_strings),
                )
            )
            if warehouse_id:
                query = query.filter(
                    or_(
                        StockMovement.from_warehouse_id == warehouse_id,
                        StockMovement.to_warehouse_id == warehouse_id,
                    )
                )
            elif allowed_warehouse_ids is not None:
                query = query.filter(
                    or_(
                        StockMovement.from_warehouse_id.in_(allowed_warehouse_ids),
                        StockMovement.to_warehouse_id.in_(allowed_warehouse_ids),
                    )
                )
        elif direction == "in":
            query = query.filter(
                or_(
                    StockMovement.movement_type.in_(INBOUND_TYPES),
                    cast(StockMovement.movement_type, String).ilike("%in"),
                    cast(StockMovement.movement_type, String).in_(inbound_strings),
                )
            )
            if warehouse_id:
                query = query.filter(
                    or_(
                        StockMovement.to_warehouse_id == warehouse_id,
                        StockMovement.from_warehouse_id == warehouse_id,
                    )
                )
            elif allowed_warehouse_ids is not None:
                query = query.filter(
                    or_(
                        StockMovement.to_warehouse_id.in_(allowed_warehouse_ids),
                        StockMovement.from_warehouse_id.in_(allowed_warehouse_ids),
                    )
                )
        else:
            if warehouse_id:
                query = query.filter(
                    or_(StockMovement.from_warehouse_id == warehouse_id, StockMovement.to_warehouse_id == warehouse_id)
                )
            elif allowed_warehouse_ids is not None:
                query = query.filter(
                    or_(
                        StockMovement.from_warehouse_id.in_(allowed_warehouse_ids),
                        StockMovement.to_warehouse_id.in_(allowed_warehouse_ids),
                    )
                )

        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        if movement_type:
            query = query.filter(StockMovement.movement_type == movement_type)
        if date_from:
            query = query.filter(StockMovement.created_at >= date_from)
        if date_to:
            from datetime import timedelta
            query = query.filter(StockMovement.created_at < date_to + timedelta(days=1))
        if search and search.strip():
            from app.models.access_control import User

            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    cast(StockMovement.id, String).ilike(pattern),
                    cast(StockMovement.reference_id, String).ilike(pattern),
                    StockMovement.reference_type.ilike(pattern),
                    StockMovement.note.ilike(pattern),
                    cast(StockMovement.quantity, String).ilike(pattern),
                    self.db.query(Product.id).filter(
                        Product.id == StockMovement.product_id,
                        or_(Product.name.ilike(pattern), Product.product_code.ilike(pattern)),
                    ).exists(),
                    self.db.query(ProductVariant.id).filter(
                        ProductVariant.id == StockMovement.variant_id,
                        or_(ProductVariant.name.ilike(pattern), ProductVariant.sku.ilike(pattern), ProductVariant.barcode.ilike(pattern)),
                    ).exists(),
                    self.db.query(Warehouse.id).filter(
                        Warehouse.id == StockMovement.from_warehouse_id,
                        Warehouse.name.ilike(pattern),
                    ).exists(),
                    self.db.query(Warehouse.id).filter(
                        Warehouse.id == StockMovement.to_warehouse_id,
                        Warehouse.name.ilike(pattern),
                    ).exists(),
                    self.db.query(Supplier.id).filter(
                        Supplier.id == StockMovement.supplier_id,
                        Supplier.name.ilike(pattern),
                    ).exists(),
                    self.db.query(Customer.id).filter(
                        Customer.id == StockMovement.customer_id,
                        Customer.name.ilike(pattern),
                    ).exists(),
                    self.db.query(SerializedItem.id).filter(
                        SerializedItem.id == StockMovement.product_item_id,
                        or_(SerializedItem.serial_number.ilike(pattern), SerializedItem.barcode.ilike(pattern)),
                    ).exists(),
                    cast(StockMovement.created_by, String).ilike(pattern),
                )
            )
        
        total = query.count()
        items = (
            query.order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        
        # Enrich with names
        result = []
        for m in items:
            product = self.db.query(Product).filter(Product.id == m.product_id).first()
            variant = self.db.query(ProductVariant).filter(ProductVariant.id == m.variant_id).first() if m.variant_id else None
            from_wh = self.db.query(Warehouse).filter(Warehouse.id == m.from_warehouse_id).first() if m.from_warehouse_id else None
            to_wh = self.db.query(Warehouse).filter(Warehouse.id == m.to_warehouse_id).first() if m.to_warehouse_id else None
            supplier = self.db.query(Supplier).filter(Supplier.id == m.supplier_id).first() if m.supplier_id else None
            customer = self.db.query(Customer).filter(Customer.id == m.customer_id).first() if m.customer_id else None
            serialized_item = self.db.query(SerializedItem).filter(SerializedItem.id == m.product_item_id).first() if m.product_item_id else None
            creator = self.db.query(User).filter(User.id == m.created_by).first() if m.created_by else None

            ref_number = None
            if m.reference_id:
                ref_number = str(m.reference_id)
            elif m.note and "Ref:" in m.note:
                import re as regex_mod
                ref_match = regex_mod.search(r"Ref:\s*([^|]+)", m.note, regex_mod.IGNORECASE)
                if ref_match:
                    ref_number = ref_match.group(1).strip()

            barcode_val = (
                (serialized_item.barcode if serialized_item else None)
                or (variant.barcode if variant else None)
                or (getattr(product, "barcode", None) if product else None)
            )

            category_name = None
            category_id = None
            if product:
                category_id = product.category_id
                if product.category:
                    category_name = product.category.name

            unit_price = 0.0
            if variant and variant.selling_price is not None:
                unit_price = float(variant.selling_price)
            elif product and getattr(product, "variants", None):
                for pv in product.variants:
                    if pv.selling_price is not None:
                        unit_price = float(pv.selling_price)
                        break

            total_price = round(unit_price * (m.quantity or 1), 2)

            result.append({
                "id": m.id,
                "product_id": m.product_id,
                "product_name": product.name if product else None,
                "product_code": product.product_code if product else None,
                "category_id": category_id,
                "category_name": category_name or "General",
                "variant_id": m.variant_id,
                "variant_sku": variant.sku if variant else None,
                "variant_name": variant.name if variant else None,
                "barcode": barcode_val,
                "serial_number": serialized_item.serial_number if serialized_item else None,
                "tracking_type": product.tracking_type.value if (product and hasattr(product.tracking_type, "value")) else (str(product.tracking_type) if product else "bulk"),
                "product_item_id": m.product_item_id,
                "movement_type": m.movement_type.value if hasattr(m.movement_type, 'value') else str(m.movement_type),
                "quantity": m.quantity,
                "unit_price": unit_price,
                "total_price": total_price,
                "from_warehouse_id": m.from_warehouse_id,
                "from_warehouse_name": from_wh.name if from_wh else None,
                "to_warehouse_id": m.to_warehouse_id,
                "to_warehouse_name": to_wh.name if to_wh else None,
                "supplier_id": m.supplier_id,
                "supplier_name": supplier.name if supplier else None,
                "customer_id": m.customer_id,
                "customer_name": customer.name if customer else None,
                "reference_type": m.reference_type,
                "reference_id": m.reference_id,
                "reference_number": ref_number,
                "note": m.note,
                "attachment_url": getattr(m, "attachment_url", None),
                "created_by": m.created_by,
                "created_by_name": creator.name if creator else None,
                "created_at": m.created_at,
            })
        
        return result, total

    def get_today_movement_count(self, movement_types=None):
        """Count movements created today."""
        from datetime import date as date_type
        from sqlalchemy import func
        query = self.db.query(func.count(StockMovement.id)).filter(
            func.date(StockMovement.created_at) == date_type.today()
        )
        if movement_types:
            query = query.filter(StockMovement.movement_type.in_(movement_types))
        return query.scalar() or 0

    def get_total_movement_count(self, movement_types=None):
        """Count total movements."""
        from sqlalchemy import func
        query = self.db.query(func.count(StockMovement.id))
        if movement_types:
            query = query.filter(StockMovement.movement_type.in_(movement_types))
        return query.scalar() or 0