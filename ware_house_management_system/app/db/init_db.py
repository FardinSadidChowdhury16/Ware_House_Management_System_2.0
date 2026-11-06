from sqlalchemy.orm import Session
from app.core import security
from app.models.access_control import User, Role, Permission

def init_db(db: Session) -> None:
    # 1. Default Permissions (Standardized into _read and _write for CRUD-capable modules)
    permissions_data = [
        # Users & Roles
        ("user_read", "Users"),
        ("user_write", "Users"),

        # Customers
        ("customer_read", "Customers"),
        ("customer_write", "Customers"),

        # Suppliers
        ("supplier_read", "Suppliers"),
        ("supplier_write", "Suppliers"),

        # Warehouses
        ("warehouse_read", "Warehouses"),
        ("warehouse_write", "Warehouses"),

        # Products
        ("product_read", "Products"),
        ("product_write", "Products"),

        # Barcode
        ("barcode_read", "Barcode"),
        ("barcode_write", "Barcode"),

        # Operations: Stock In, Stock Out, Transfer
        ("stock_in_read", "Stock In"),
        ("stock_in_write", "Stock In"),
        ("stock_out_read", "Stock Out"),
        ("stock_out_write", "Stock Out"),
        ("transfer_read", "Transfer"),
        ("transfer_write", "Transfer"),

        # Returns & Servicing
        ("return_read", "Returns"),
        ("return_write", "Returns"),

        # Warranty
        ("warranty_read", "Warranty"),
        ("warranty_write", "Warranty"),

        # Tax / Settings
        ("tax_read", "Settings"),
        ("tax_write", "Settings"),

        # Read-only / Monitor Modules
        ("inventory_read", "Inventory"),
        ("tracking_read", "Tracking"),
        ("report_read", "Reports"),

        # Approvals
        ("approval_read", "Approvals"),
        ("stock_in_approve", "Approvals"),
        ("stock_out_approve", "Approvals"),
        ("transfer_approve", "Approvals"),
    ]
    
    for perm_name, module in permissions_data:
        perm = db.query(Permission).filter(Permission.name == perm_name).first()
        if not perm:
            db.add(Permission(name=perm_name, module=module))
    db.commit()

    # Migrate deprecated permissions to new read/write permissions
    legacy_map = {
        "user_create": "user_write",
        "user_update": "user_write",
        "customer_create": "customer_write",
        "warehouse_create": "warehouse_write",
    }
    for old_name, new_name in legacy_map.items():
        old_perm = db.query(Permission).filter(Permission.name == old_name).first()
        new_perm = db.query(Permission).filter(Permission.name == new_name).first()
        if old_perm and new_perm:
            for role in list(old_perm.roles):
                if new_perm not in role.permissions:
                    role.permissions.append(new_perm)
            db.delete(old_perm)
    db.commit()

    # 2. Default Admin Role
    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    if not admin_role:
        all_permissions = db.query(Permission).all()
        admin_role = Role(name="Admin", description="Super Administrator", permissions=all_permissions)
        db.add(admin_role)
        db.commit()
        db.refresh(admin_role)
    else:
        admin_role.permissions = db.query(Permission).all()
        db.commit()

    # 3. Default Admin User
    admin_user = db.query(User).filter(User.email == "admin@admin.com").first()

    if not admin_user:
        admin_user = User(
            name="Super Administrator",
            user_name="superadmin",
            email="admin@admin.com",
            password=security.get_password_hash("admin123"),
            status=True,
            role_id=admin_role.id,
        )
        db.add(admin_user)
    else:
        admin_user.name = "Super Administrator"
        admin_user.user_name = "superadmin"
        admin_user.password = security.get_password_hash("admin123")
        admin_user.status = True
        admin_user.role_id = admin_role.id

    db.commit()