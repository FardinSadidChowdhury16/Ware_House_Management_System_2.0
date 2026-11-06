from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.products.products_service import ProductsService
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductSummaryResponse,
    ProductUpdate,
    ProductTypeCreate,
    ProductTypeResponse,
    ProductTypeUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
    TaxRuleCreate,
    TaxRuleUpdate,
    TaxRuleResponse,
)


class ProductsController:
    @staticmethod
    def create_product_type(type_in: ProductTypeCreate, db: Session) -> ProductTypeResponse:
        service = ProductsService(db)
        return service.add_product_type(type_in)

    @staticmethod
    def get_product_types(db: Session) -> List[ProductTypeResponse]:
        service = ProductsService(db)
        return service.fetch_product_types()

    @staticmethod
    def update_product_type(product_type_id: int, type_in: ProductTypeUpdate, db: Session) -> ProductTypeResponse:
        service = ProductsService(db)
        return service.update_product_type(product_type_id, type_in)

    @staticmethod
    def delete_product_type(product_type_id: int, db: Session):
        service = ProductsService(db)
        return service.delete_product_type(product_type_id)

    @staticmethod
    def create_tax_rule(tax_in: TaxRuleCreate, db: Session) -> TaxRuleResponse:
        service = ProductsService(db)
        return service.add_tax_rule(tax_in)

    @staticmethod
    def get_tax_rules(db: Session) -> List[TaxRuleResponse]:
        service = ProductsService(db)
        return service.fetch_tax_rules()

    @staticmethod
    def update_tax_rule(tax_id: int, tax_in: TaxRuleUpdate, db: Session) -> TaxRuleResponse:
        service = ProductsService(db)
        return service.update_tax_rule(tax_id, tax_in)

    @staticmethod
    def delete_tax_rule(tax_id: int, db: Session):
        service = ProductsService(db)
        return service.delete_tax_rule(tax_id)

    @staticmethod
    def create_product(product_in: ProductCreate, db: Session) -> ProductResponse:
        service = ProductsService(db)
        return service.add_product(product_in)

    @staticmethod
    def update_product(product_id: int, product_in: ProductUpdate, db: Session, current_user=None) -> ProductResponse:
        service = ProductsService(db)
        return service.update_product(product_id, product_in, current_user=current_user)

    @staticmethod
    def delete_product(product_id: int, db: Session, current_user=None):
        service = ProductsService(db)
        return service.delete_product(product_id, current_user=current_user)

    @staticmethod
    def get_products(skip: int, limit: int, db: Session) -> List[ProductResponse]:
        service = ProductsService(db)
        return service.fetch_products(skip, limit)

    @staticmethod
    def get_products_paginated(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        tracking: Optional[str] = None,
        status: Optional[str] = None,
        stock_status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ):
        service = ProductsService(db)
        return service.fetch_products_paginated(
            page, page_size, search, tracking, status, stock_status, warehouse_id, allowed_warehouse_ids
        )

    @staticmethod
    def get_variants_paginated(
        product_id: int,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        stock_status: Optional[str] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ):
        service = ProductsService(db)
        return service.fetch_variants_paginated(
            product_id, page, page_size, search, status, warehouse_id, stock_status, allowed_warehouse_ids
        )

    @staticmethod
    def get_products_summary(skip: int, limit: int, db: Session) -> List[ProductSummaryResponse]:
        service = ProductsService(db)
        return service.fetch_products_summary(skip, limit)

    @staticmethod
    def get_product(product_id: int, db: Session, current_user=None) -> ProductResponse:
        service = ProductsService(db)
        return service.fetch_product_by_id(product_id, current_user=current_user)

    @staticmethod
    def get_product_detail(product_id: int, db: Session, current_user=None) -> ProductResponse:
        service = ProductsService(db)
        return service.fetch_product_detail(product_id, current_user=current_user)

    @staticmethod
    def create_variant(product_id: int, variant_in: ProductVariantCreate, db: Session, current_user=None):
        service = ProductsService(db)
        return service.add_variant_to_product(product_id, variant_in, current_user=current_user)

    @staticmethod
    def create_variants_batch(product_id: int, variants_in: list, db: Session, current_user=None):
        service = ProductsService(db)
        return service.add_variants_batch_to_product(product_id, variants_in, current_user=current_user)

    @staticmethod
    def get_variant(product_id: int, variant_id: int, db: Session, current_user=None):
        service = ProductsService(db)
        return service.get_variant_for_product(product_id, variant_id, current_user=current_user)

    @staticmethod
    def update_variant(product_id: int, variant_id: int, variant_in: ProductVariantUpdate, db: Session, current_user=None):
        service = ProductsService(db)
        return service.update_variant(product_id, variant_id, variant_in, current_user=current_user)

    @staticmethod
    def delete_variant(product_id: int, variant_id: int, db: Session, current_user=None):
        service = ProductsService(db)
        return service.delete_variant(product_id, variant_id, current_user=current_user)

    @staticmethod
    def update_variant_price(product_id: int, variant_id: int, cost_price: Optional[float], selling_price: Optional[float], db: Session, current_user=None):
        service = ProductsService(db)
        return service.update_variant_price(product_id, variant_id, cost_price, selling_price, current_user=current_user)


    @staticmethod
    def batch_update_variants(product_id: int, items: list, db: Session, current_user=None):
        service = ProductsService(db)
        return service.batch_update_variants_for_product(product_id, items, current_user=current_user)
