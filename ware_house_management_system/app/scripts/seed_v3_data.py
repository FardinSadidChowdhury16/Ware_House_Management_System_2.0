import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.product import TrackingType, AttributeType, ProductStatus, VariantStatus, ProductType, Product
from app.models.inventory import ItemStatus, MovementType, SerializedItem
from app.models.service import ClaimStatus, ClaimPriority, ServiceStatus, ServiceType

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

        # 1. Product Type (Get or Create)
        prod_type = db.query(ProductType).filter(ProductType.name == "Electronics").first()
        if not prod_type:
            prod_type = products_svc.add_product_type(ProductTypeCreate(
                name="Electronics",
                description="Electronic devices with serial tracking",
                default_tracking_type=TrackingType.SERIALIZED,
                attributes=[
                    ProductTypeAttributeCreate(name="Storage", attribute_type=AttributeType.STRING, is_required=True),
                    ProductTypeAttributeCreate(name="RAM", attribute_type=AttributeType.STRING, is_required=False)
                ]
            ))
            print(f"✅ Product Type created ID: {prod_type.id}")
        else:
            print(f"ℹ️ Product Type 'Electronics' already exists ID: {prod_type.id}")

        # 2. Product (Get or Create)
        product = db.query(Product).filter(Product.product_code == "PHN-FLG-001").first()
        if not product:
            product = products_svc.add_product(ProductCreate(
                name="Flagship Smartphone",
                product_code="PHN-FLG-001",
                tracking_type=TrackingType.SERIALIZED,
                min_stock_level=5,
                status=ProductStatus.ACTIVE,
                variants=[
                    ProductVariantCreate(
                        sku="PHN-FLG-256GB",
                        name="256GB Black Variant",
                        cost_price=700.00,
                        selling_price=999.99,
                        status=VariantStatus.ACTIVE
                    )
                ]
            ))
            print(f"✅ Product created ID: {product.id}")
        else:
            print(f"ℹ️ Product 'PHN-FLG-001' already exists ID: {product.id}")

        variant_id = product.variants[0].id

        # 3. Serialized Inventory Item (Get or Create)
        serial_no = "SN-PHONE-2026-X01"
        item = db.query(SerializedItem).filter(SerializedItem.serial_number == serial_no).first()
        if not item:
            item = inventory_svc.add_serialized_item(SerializedItemCreate(
                serial_number=serial_no,
                product_id=product.id,
                variant_id=variant_id,
                warehouse_id=1,
                status=ItemStatus.IN_STOCK,
                purchase_date=datetime.utcnow(),
                warranty_expiry=datetime.utcnow() + timedelta(days=365)
            ))
            print(f"✅ Serialized Item created SN: {item.serial_number}")
        else:
            print(f"ℹ️ Serialized Item '{serial_no}' already exists ID: {item.id}")

        # 4. Record Stock Movement
        movement = inventory_svc.process_stock_movement(StockMovementCreate(
            product_id=product.id,
            variant_id=variant_id,
            to_warehouse_id=1,
            quantity=1,
            movement_type=MovementType.INBOUND,
            reference_number="PO-2026-001"
        ), user_id=1)
        print(f"✅ Stock Movement logged ID: {movement.id}")

        # 5. File a Warranty Claim
        claim = services_svc.file_warranty_claim(WarrantyClaimCreate(
            serialized_item_id=item.id,
            customer_id=1,
            claim_date=datetime.utcnow(),
            issue_description="Screen touch unresponsiveness",
            priority=ClaimPriority.HIGH,
            status=ClaimStatus.PENDING
        ))
        print(f"✅ Warranty Claim filed ID: {claim.id}")

        # 6. Add Service Record
        record = services_svc.add_service_record(ServiceRecordCreate(
            serialized_item_id=item.id,
            service_type=ServiceType.REPAIR,
            status=ServiceStatus.IN_PROGRESS,
            technician_notes="Replacing display panel",
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