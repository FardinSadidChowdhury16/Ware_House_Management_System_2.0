from fastapi import APIRouter
from app.modules.auth.auth_route import router as auth_router
from app.modules.customers.customers_route import router as customers_router
from app.modules.suppliers.suppliers_route import router as suppliers_router
from app.modules.users.users_route import router as users_router
from app.modules.warehouses.warehouses_route import router as warehouses_router
from app.modules.roles.roles_route import router as roles_router

from app.modules.products.products_route import router as products_router
from app.modules.products.product_variants_route import router as product_variants_router
from app.modules.inventory.inventory_route import router as inventory_router
from app.modules.services.services_route import router as services_router
from app.modules.approvals.approvals_route import router as approvals_router
from app.modules.uploads.uploads_route import router as uploads_router
from app.modules.projects.projects_route import router as projects_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(customers_router, prefix="/customers", tags=["Customer Management"])
api_router.include_router(suppliers_router, prefix="/suppliers", tags=["Supplier Management"])
api_router.include_router(warehouses_router, prefix="/warehouses", tags=["Warehouse Management"])
api_router.include_router(users_router, prefix="/users", tags=["Users Management"])
api_router.include_router(roles_router, prefix="/roles", tags=["Roles & Permissions"])
api_router.include_router(products_router, prefix="/products")
api_router.include_router(product_variants_router)
api_router.include_router(inventory_router, prefix="/inventory", tags=["Inventory Management"])
api_router.include_router(services_router, prefix="/services", tags=["Warranty & Service Management"])
api_router.include_router(approvals_router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(projects_router, prefix="/projects", tags=["Project Management"])
api_router.include_router(uploads_router)
