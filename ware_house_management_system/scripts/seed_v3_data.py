import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.product import TrackingType, AttributeFieldType, EntityStatus
from app.models.inventory import ItemStatus, MovementType
from app.models.service import ClaimStatus, ServiceStatus

from app.modules.products.products_service import ProductsService
from app.modules.inventory.inventory_service import InventoryService
from app.modules.services.services_service import ServicesService

from app.schemas.product import ProductTypeCreate, ProductTypeAttributeCreate, ProductCreate, ProductVariantCreate
from app.schemas.inventory import SerializedItemCreate, StockMovementCreate
from app.schemas.service import WarrantyClaimCreate, ServiceRecordCreate

def run_seed():
    db = SessionLocal()
    print("🌱 Starting database seeding...")

    try:
        products_svc = ProductsService(db)
        inventory_svc = InventoryService(db)
        services_svc = ServicesService(db)

        # 1. Create Product Type with Dynamic Attributes
        prod_type = products_svc.add_product_type(ProductTypeCreate(
            name="Electronics",
            description="Electronic devices with serial tracking",
            default_tracking_type=TrackingType.SERIALIZED,
            attributes=[
                ProductTypeAttributeCreate(field_key="storage", field_label="Storage", field_type=AttributeFieldType.TEXT, is_required=True),
                ProductTypeAttributeCreate(field_key="ram", field_label="RAM", field_type=AttributeFieldType.TEXT, is_required=False)
            ]
        ))
        print(f"✅ Product Type created ID: {prod_type.id}")

        # 2. Create Product & Variant
        product = products_svc.add_product(ProductCreate(
            name="Flagship Smartphone",
            product_code="PHN-FLG-001",
            category_id=prod_type.id,
            tracking_type=TrackingType.SERIALIZED,
            min_stock_level=5,
            status=EntityStatus.ACTIVE,
            variants=[
                ProductVariantCreate(
                    sku="PHN-FLG-256GB",
                    name="256GB Black Variant",
                    cost_price=700.00,
                    selling_price=999.99,
                    status=EntityStatus.ACTIVE
                )
            ]
        ))
        print(f"✅ Product created ID: {product.id}")

        variant_id = product.variants[0].id

        # 3. Create Serialized Inventory Item
        item = inventory_svc.add_serialized_item(SerializedItemCreate(
            serial_number="SN-PHONE-2026-X01",
            product_id=product.id,
            variant_id=variant_id,
            warehouse_id=1,
            status=ItemStatus.IN_STOCK,
            warranty_start=datetime.utcnow().date(),
            warranty_end=(datetime.utcnow() + timedelta(days=365)).date()
        ))
        print(f"✅ Serialized Item created SN: {item.serial_number}")

        # 4. Record Stock Movement
        movement = inventory_svc.process_stock_movement(StockMovementCreate(
            product_id=product.id,
            variant_id=variant_id,
            to_warehouse_id=1,
            quantity=1,
            movement_type=MovementType.PURCHASE_IN,
            reference_type="purchase_order",
            reference_id=1
        ), user_id=1)
        print(f"✅ Stock Movement logged ID: {movement.id}")

        # 5. File a Warranty Claim
        claim = services_svc.file_warranty_claim(WarrantyClaimCreate(
            product_item_id=item.id,
            customer_id=1,
            issue_description="Screen touch unresponsiveness",
        ))
        print(f"✅ Warranty Claim filed ID: {claim.id}")

        # 6. Add Service Record
        record = services_svc.add_service_record(ServiceRecordCreate(
            product_item_id=item.id,
            service_type="repair",
            description="Replacing display panel",
            cost=150.00
        ))
        print(f"✅ Service Record created ID: {record.id}")

        print("🎉 Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()