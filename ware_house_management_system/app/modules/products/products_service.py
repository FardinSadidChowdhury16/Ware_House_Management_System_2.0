import math
import re
from datetime import datetime, date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.product import TaxRule
from app.modules.products.products_repository import ProductsRepository
from app.schemas.product import ProductVariantCreate, ProductVariantUpdate
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductTypeCreate,
    ProductTypeResponse,
    ProductTypeUpdate,
    TaxRuleCreate,
    TaxRuleUpdate,
    TaxRuleResponse,
)


def _parse_date_flexible(val) -> Optional[date]:
    if val is None or str(val).strip() in ("", "—", "-", "null", "none", "undefined"):
        return None
    val_str = str(val).strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            pass
    if len(val_str) >= 10:
        sub = val_str[:10]
        try:
            return datetime.strptime(sub, "%Y-%m-%d").date()
        except ValueError:
            pass
    raise ValueError(f"Cannot parse '{val_str}' as a valid date. Expected format: YYYY-MM-DD")


def _parse_price_flexible(val) -> Optional[float]:
    if val is None or str(val).strip() in ("", "—", "-", "null", "none", "undefined"):
        return None
    val_str = str(val).strip()
    stripped = re.sub(r"[৳$€£¥,\s]", "", val_str)
    if not stripped:
        return None
    try:
        num = float(stripped)
    except ValueError:
        raise ValueError(f"'{val_str}' is not a valid number")
    if num < 0:
        raise ValueError(f"Price cannot be negative: '{val_str}'")
    return round(num, 2)


def _parse_status_flexible(val):
    from app.models.product import EntityStatus
    if val is None or str(val).strip() in ("", "—", "-", "null", "none", "undefined"):
        return None
    s = str(val).strip().lower()
    if s in ("active", "act", "1", "true"):
        return EntityStatus.ACTIVE
    elif s in ("inactive", "inact", "0", "false"):
        return EntityStatus.INACTIVE
    raise ValueError(f"Invalid status '{val}'. Allowed values are 'Active' or 'Inactive'")


def _normalize_key(k: str) -> str:
    """Helper to normalize dictionary keys for resilient CSV column matching."""
    return re.sub(r"[^a-z0-9]", "", str(k).lower())


def _get_row_field(row: dict, field_type: str):
    """
    Intelligently retrieves a value from row dict by matching common variations of column headers.
    Handles Excel ANSI conversions (e.g. 'Cost Price (?)'), currencies, and case differences.
    """
    for k, v in row.items():
        norm = _normalize_key(k)
        if field_type == "id":
            if norm == "id":
                return v
        elif field_type == "barcode":
            if norm in ("barcode", "bar_code", "itembarcode", "itemcode") or ("barcode" in norm and "scan" not in norm):
                return v
        elif field_type == "name":
            if norm in ("name", "nameserialnumber", "serialnumber", "serial", "itemname", "variantname"):
                return v
            if "name" in norm and "warehouse" not in norm and "product" not in norm and "category" not in norm and "attr" not in norm:
                return v
        elif field_type == "cost_price":
            if "cost" in norm or "purchase" in norm:
                return v
        elif field_type == "selling_price":
            if "sell" in norm or "sale" in norm:
                return v
            if norm == "price":
                return v
        elif field_type == "warranty_start_date":
            if "warranty" in norm and "start" in norm:
                return v
        elif field_type == "warranty_end_date":
            if "warranty" in norm and ("end" in norm or "expir" in norm):
                return v
        elif field_type == "status":
            if "status" in norm and "stock" not in norm:
                return v
        elif field_type == "tax_rules":
            if "tax" in norm:
                return v
    return None


class ProductsService:
    def __init__(self, db: Session):
        self.repo = ProductsRepository(db)

    def add_product_type(self, type_in: ProductTypeCreate) -> ProductTypeResponse:
        return self.repo.create_product_type(type_in)

    def fetch_product_types(self) -> List[ProductTypeResponse]:
        return self.repo.get_all_product_types()

    def update_product_type(self, product_type_id: int, type_in: ProductTypeUpdate) -> ProductTypeResponse:
        product_type = self.repo.get_product_type_by_id(product_type_id)
        if not product_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product type with ID {product_type_id} not found",
            )

        update_data = type_in.model_dump(exclude_unset=True)
        if update_data.get("name") is not None and not str(update_data["name"]).strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product type name cannot be empty.",
            )
        if update_data.get("name") is not None:
            update_data["name"] = str(update_data["name"]).strip()

        updated_type = self.repo.update_product_type(product_type_id, update_data)
        if updated_type is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product type with ID {product_type_id} not found",
            )
        return updated_type

    def delete_product_type(self, product_type_id: int):
        product_type = self.repo.get_product_type_by_id(product_type_id)
        if not product_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product type with ID {product_type_id} not found",
            )
        if product_type.products:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete product type because products are using it.",
            )

        deleted = self.repo.delete_product_type(product_type_id)
        if deleted is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product type with ID {product_type_id} not found",
            )
        return deleted

    def add_tax_rule(self, tax_in: TaxRuleCreate) -> TaxRuleResponse:
        return self.repo.create_tax_rule(tax_in)

    def fetch_tax_rules(self) -> List[TaxRuleResponse]:
        return self.repo.get_all_tax_rules()

    def update_tax_rule(self, tax_id: int, tax_in: TaxRuleUpdate) -> TaxRuleResponse:
        tax_rule = self.repo.get_tax_rule_by_id(tax_id)
        if not tax_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tax rule with ID {tax_id} not found",
            )
        update_data = tax_in.model_dump(exclude_unset=True)
        updated = self.repo.update_tax_rule(tax_id, update_data)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tax rule with ID {tax_id} not found",
            )
        return updated

    def delete_tax_rule(self, tax_id: int):
        tax_rule = self.repo.get_tax_rule_by_id(tax_id)
        if not tax_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tax rule with ID {tax_id} not found",
            )
        deleted = self.repo.delete_tax_rule(tax_id)
        if deleted is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tax rule with ID {tax_id} not found",
            )
        return deleted

    def add_product(self, product_in: ProductCreate) -> ProductResponse:
        if product_in.product_code and product_in.product_code.strip():
            existing = self.repo.get_product_by_code(product_in.product_code.strip())
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with code '{product_in.product_code}' already exists.",
                )
        return self.repo.create_product_with_variants(product_in)

    def update_product(self, product_id: int, product_in: ProductUpdate, current_user=None) -> ProductResponse:
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found",
            )
        if current_user is not None:
            from app.core.warehouse_access import can_user_access_product
            if not can_user_access_product(self.repo.db, current_user, product_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to modify products in this warehouse.",
                )
        if product_in.product_code and product_in.product_code != product.product_code:
            existing = self.repo.get_product_by_code(product_in.product_code)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with code '{product_in.product_code}' already exists.",
                )
        update_data = product_in.model_dump(exclude_unset=True)
        updated = self.repo.update_product(product_id, update_data)
        return updated

    def delete_product(self, product_id: int, current_user=None):
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found",
            )
        if current_user is not None:
            from app.core.warehouse_access import can_user_access_product
            if not can_user_access_product(self.repo.db, current_user, product_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to delete products in this warehouse.",
                )
        return self.repo.delete_product(product_id)

    def fetch_products(self, skip: int = 0, limit: int = 100) -> List[ProductResponse]:
        return self.repo.get_products(skip, limit)

    def fetch_products_paginated(
        self,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        tracking: Optional[str] = None,
        status: Optional[str] = None,
        stock_status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ):
        items, total = self.repo.get_products_paginated(
            page=page,
            page_size=page_size,
            search=search,
            tracking=tracking,
            status=status,
            stock_status=stock_status,
            warehouse_id=warehouse_id,
            allowed_warehouse_ids=allowed_warehouse_ids,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def fetch_variants_paginated(
        self,
        product_id: int,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        stock_status: Optional[str] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ):
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found",
            )
        items, total = self.repo.get_variants_paginated(
            product_id=product_id,
            page=page,
            page_size=page_size,
            search=search,
            status=status,
            warehouse_id=warehouse_id,
            stock_status=stock_status,
            allowed_warehouse_ids=allowed_warehouse_ids,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def fetch_products_summary(self, skip: int = 0, limit: int = 100):
        return self.repo.get_products(skip, limit)

    def fetch_product_by_id(self, product_id: int, current_user=None) -> ProductResponse:
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found",
            )
        if current_user is not None:
            from app.core.warehouse_access import can_user_access_product
            if not can_user_access_product(self.repo.db, current_user, product_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to access products in this warehouse.",
                )
        return product

    def fetch_product_detail(self, product_id: int, current_user=None) -> ProductResponse:
        return self.fetch_product_by_id(product_id, current_user=current_user)

    def get_variant_for_product(self, product_id: int, variant_id: int, current_user=None):
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )

        if current_user is not None:
            from app.core.warehouse_access import can_user_access_variant
            if not can_user_access_variant(self.repo.db, current_user, variant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to access items in this warehouse.",
                )

        variant = self.repo.get_product_variant(product_id, variant_id)
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found for this product",
            )
        return variant

    def add_variant_to_product(self, product_id: int, variant_in: ProductVariantCreate, current_user=None):
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )

        if current_user is not None:
            from app.core.warehouse_access import can_user_access_product
            if not can_user_access_product(self.repo.db, current_user, product_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to add items to products in this warehouse.",
                )

        if variant_in.barcode and str(variant_in.barcode).strip():
            barcode_str = str(variant_in.barcode).strip()
            existing_barcode = self.repo.get_variant_by_barcode(barcode_str)
            if existing_barcode:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{barcode_str}' already exists in the system.",
                )

        variant_data = variant_in.model_dump(exclude={"attribute_values", "tax_rule_ids"})
        db_variant = self.repo.create_variant(product_id, variant_data)

        if variant_in.attribute_values:
            self.repo.create_variant_attributes(db_variant.id, variant_in.attribute_values)

        if variant_in.tax_rule_ids:
            taxes = self.repo.db.query(TaxRule).filter(TaxRule.id.in_(variant_in.tax_rule_ids)).all()
            db_variant.taxes.extend(taxes)
            self.repo.db.commit()

        self.repo.db.refresh(db_variant)
        return db_variant

    def add_variants_batch_to_product(self, product_id: int, variants_in: List[ProductVariantCreate], current_user=None):
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )

        if current_user is not None:
            from app.core.warehouse_access import can_user_access_product
            if not can_user_access_product(self.repo.db, current_user, product_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to add items to products in this warehouse.",
                )

        # 1. Check for duplicates within incoming batch
        incoming_barcodes = [
            str(v.barcode).strip()
            for v in variants_in
            if v.barcode and str(v.barcode).strip()
        ]
        if len(incoming_barcodes) != len(set(incoming_barcodes)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate barcodes detected within the batch.",
            )

        # 2. Check incoming barcodes against DB
        for barcode_str in incoming_barcodes:
            existing = self.repo.get_variant_by_barcode(barcode_str)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{barcode_str}' already exists in the system.",
                )

        # 3. Create all variants
        created = []
        for variant_in in variants_in:
            variant_data = variant_in.model_dump(exclude={"attribute_values", "tax_rule_ids"})
            if not variant_data.get("barcode") or not str(variant_data.get("barcode")).strip():
                variant_data["barcode"] = self.repo.generate_unique_barcode()
            db_variant = self.repo.create_variant(product_id, variant_data)

            if variant_in.attribute_values:
                self.repo.create_variant_attributes(db_variant.id, variant_in.attribute_values)

            if variant_in.tax_rule_ids:
                taxes = self.repo.db.query(TaxRule).filter(TaxRule.id.in_(variant_in.tax_rule_ids)).all()
                db_variant.taxes.extend(taxes)
                self.repo.db.commit()

            self.repo.db.refresh(db_variant)
            created.append(db_variant)

        return created

    def update_variant(self, product_id: int, variant_id: int, variant_in: ProductVariantUpdate, current_user=None):
        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )

        if current_user is not None:
            from app.core.warehouse_access import can_user_access_variant
            if not can_user_access_variant(self.repo.db, current_user, variant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to modify items in this warehouse.",
                )

        if variant_in.barcode and str(variant_in.barcode).strip():
            barcode_str = str(variant_in.barcode).strip()
            existing_barcode = self.repo.get_variant_by_barcode(barcode_str)
            if existing_barcode and existing_barcode.id != variant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{barcode_str}' already exists in the system.",
                )

        update_data = variant_in.model_dump(exclude_none=True)
        updated_variant = self.repo.update_variant(product_id, variant_id, update_data)
        if updated_variant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found for this product",
            )
        return updated_variant

    def batch_update_variants_for_product(self, product_id: int, items: list, current_user=None):
        from app.models.product import (
            ProductVariant,
            ProductTypeAttribute,
            ProductVariantAttributeValue,
            TaxRule,
        )

        product = self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found",
            )

        if current_user is not None:
            from app.core.warehouse_access import can_user_access_product
            if not can_user_access_product(self.repo.db, current_user, product_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to modify items of this product.",
                )

        existing_variants = (
            self.repo.db.query(ProductVariant)
            .filter(ProductVariant.product_id == product_id)
            .all()
        )
        by_id = {v.id: v for v in existing_variants}
        by_barcode = {v.barcode.strip(): v for v in existing_variants if v.barcode}
        by_name = {v.name.strip().lower(): v for v in existing_variants if v.name}

        all_other_barcodes = {
            b.strip()
            for (b,) in self.repo.db.query(ProductVariant.barcode)
            .filter(
                ProductVariant.barcode.isnot(None),
                ProductVariant.product_id != product_id,
            )
            .all()
            if b
        }

        cat_attrs = (
            self.repo.db.query(ProductTypeAttribute)
            .filter(ProductTypeAttribute.product_type_id == product.category_id)
            .all()
        )
        attr_by_norm = {}
        for a in cat_attrs:
            if a.field_label:
                attr_by_norm[_normalize_key(a.field_label)] = a
                no_unit = re.sub(r"\s*\(.*?\)", "", a.field_label)
                attr_by_norm[_normalize_key(no_unit)] = a
            if a.field_key:
                attr_by_norm[_normalize_key(a.field_key)] = a
            attr_by_norm[f"attr{a.id}"] = a

        tax_rules = self.repo.db.query(TaxRule).all()
        tax_by_name = {t.name.strip().lower(): t for t in tax_rules if t.name}

        total_processed = len(items)
        errors = []
        updated_items = []

        for idx, row in enumerate(items, start=1):
            if not isinstance(row, dict):
                errors.append({
                    "row": idx,
                    "serial_number": "",
                    "barcode": "",
                    "message": "Invalid row data format (expected key-value object).",
                })
                continue

            row_id = _get_row_field(row, "id")
            row_barcode = _get_row_field(row, "barcode")
            row_name = _get_row_field(row, "name")

            matched_variant = None

            # 1. Match by ID
            if row_id is not None and str(row_id).strip() not in ("", "—", "-"):
                try:
                    int_id = int(str(row_id).strip())
                    if int_id in by_id:
                        matched_variant = by_id[int_id]
                    else:
                        other = (
                            self.repo.db.query(ProductVariant)
                            .filter(ProductVariant.id == int_id)
                            .first()
                        )
                        if other:
                            other_p_name = other.product.name if other.product else f"ID {other.product_id}"
                            errors.append({
                                "row": idx,
                                "serial_number": str(row_name or ""),
                                "barcode": str(row_barcode or ""),
                                "message": f"Rejected: Item with ID {int_id} belongs to another product ('{other_p_name}'), not this product.",
                            })
                            continue
                        else:
                            errors.append({
                                "row": idx,
                                "serial_number": str(row_name or ""),
                                "barcode": str(row_barcode or ""),
                                "message": f"Rejected: Item with ID {int_id} does not exist in the system (Cannot create new items via batch update).",
                            })
                            continue
                except ValueError:
                    errors.append({
                        "row": idx,
                        "serial_number": str(row_name or ""),
                        "barcode": str(row_barcode or ""),
                        "message": f"Invalid ID format: '{row_id}'. Expected an integer ID.",
                    })
                    continue

            # 2. Match by Barcode
            if not matched_variant and row_barcode and str(row_barcode).strip() not in ("", "—", "-"):
                clean_bc = str(row_barcode).strip()
                if clean_bc in by_barcode:
                    matched_variant = by_barcode[clean_bc]
                else:
                    other = (
                        self.repo.db.query(ProductVariant)
                        .filter(ProductVariant.barcode == clean_bc)
                        .first()
                    )
                    if other:
                        other_p_name = other.product.name if other.product else f"ID {other.product_id}"
                        errors.append({
                            "row": idx,
                            "serial_number": str(row_name or ""),
                            "barcode": clean_bc,
                            "message": f"Rejected: Barcode '{clean_bc}' belongs to another product ('{other_p_name}').",
                        })
                        continue
                    else:
                        errors.append({
                            "row": idx,
                            "serial_number": str(row_name or ""),
                            "barcode": clean_bc,
                            "message": f"Rejected: Barcode '{clean_bc}' does not exist for this product (Cannot create new items via batch update).",
                        })
                        continue

            # 3. Match by Name / Serial Number
            if not matched_variant and row_name and str(row_name).strip() not in ("", "—", "-"):
                clean_name = str(row_name).strip().lower()
                if clean_name in by_name:
                    matched_variant = by_name[clean_name]

            if not matched_variant:
                errors.append({
                    "row": idx,
                    "serial_number": str(row_name or ""),
                    "barcode": str(row_barcode or ""),
                    "message": "Rejected: Item could not be identified or does not belong to this product.",
                })
                continue

            if current_user is not None:
                from app.core.warehouse_access import can_user_access_variant
                if not can_user_access_variant(self.repo.db, current_user, matched_variant.id):
                    errors.append({
                        "row": idx,
                        "serial_number": matched_variant.name or str(row_name or ""),
                        "barcode": matched_variant.barcode or str(row_barcode or ""),
                        "message": "Permission denied: You do not have permission to modify items in this warehouse.",
                    })
                    continue

            row_errors = []
            updates = {}

            if row_name is not None:
                n_str = str(row_name).strip()
                if n_str not in ("", "—", "-") and n_str != (matched_variant.name or ""):
                    updates["name"] = n_str

            if row_barcode is not None:
                new_bc = str(row_barcode).strip()
                if new_bc not in ("", "—", "-") and new_bc != (matched_variant.barcode or ""):
                    if new_bc in all_other_barcodes:
                        row_errors.append(f"Barcode '{new_bc}' is already used by another product.")
                    else:
                        conflict = (
                            self.repo.db.query(ProductVariant)
                            .filter(
                                ProductVariant.product_id == product_id,
                                ProductVariant.barcode == new_bc,
                                ProductVariant.id != matched_variant.id,
                            )
                            .first()
                        )
                        if conflict:
                            row_errors.append(f"Barcode '{new_bc}' is already assigned to item '{conflict.name}'.")
                        else:
                            updates["barcode"] = new_bc

            cost_raw = _get_row_field(row, "cost_price")
            if cost_raw is not None and str(cost_raw).strip() not in ("", "—", "-"):
                try:
                    p = _parse_price_flexible(cost_raw)
                    if p is not None:
                        updates["cost_price"] = p
                except ValueError as ve:
                    row_errors.append(f"Cost Price: {str(ve)}")

            sell_raw = _get_row_field(row, "selling_price")
            if sell_raw is not None and str(sell_raw).strip() not in ("", "—", "-"):
                try:
                    p = _parse_price_flexible(sell_raw)
                    if p is not None:
                        updates["selling_price"] = p
                except ValueError as ve:
                    row_errors.append(f"Selling Price: {str(ve)}")

            status_raw = _get_row_field(row, "status")
            if status_raw is not None and str(status_raw).strip() not in ("", "—", "-"):
                try:
                    st = _parse_status_flexible(status_raw)
                    if st is not None:
                        updates["status"] = st
                except ValueError as ve:
                    row_errors.append(f"Status: {str(ve)}")

            ws_raw = _get_row_field(row, "warranty_start_date")
            if ws_raw is not None:
                if str(ws_raw).strip() in ("", "—", "-", "null", "none"):
                    updates["warranty_start_date"] = None
                else:
                    try:
                        updates["warranty_start_date"] = _parse_date_flexible(ws_raw)
                    except ValueError as ve:
                        row_errors.append(f"Warranty Start Date: {str(ve)}")

            we_raw = _get_row_field(row, "warranty_end_date")
            if we_raw is not None:
                if str(we_raw).strip() in ("", "—", "-", "null", "none"):
                    updates["warranty_end_date"] = None
                else:
                    try:
                        updates["warranty_end_date"] = _parse_date_flexible(we_raw)
                    except ValueError as ve:
                        row_errors.append(f"Warranty End Date: {str(ve)}")

            if row_errors:
                errors.append({
                    "row": idx,
                    "serial_number": matched_variant.name or str(row_name or ""),
                    "barcode": matched_variant.barcode or str(row_barcode or ""),
                    "message": " | ".join(row_errors),
                })
                continue

            for k, v in updates.items():
                setattr(matched_variant, k, v)

            tax_raw = _get_row_field(row, "tax_rules")
            if tax_raw is not None and str(tax_raw).strip() not in ("", "—", "-"):
                t_names = [t.strip().lower() for t in str(tax_raw).split(",") if t.strip()]
                matched_taxes = [tax_by_name[n] for n in t_names if n in tax_by_name]
                if matched_taxes:
                    matched_variant.taxes = matched_taxes

            for key, val in row.items():
                if val is None or str(val).strip() in ("", "—", "-"):
                    continue
                k_norm = _normalize_key(key)
                if k_norm in ("id", "barcode", "name", "nameserialnumber", "stockstatus", "warehouse", "status", "taxrules"):
                    continue
                if "cost" in k_norm or "sell" in k_norm or "price" in k_norm or "warranty" in k_norm:
                    continue

                target_attr = attr_by_norm.get(k_norm)
                if not target_attr:
                    k_no_unit = re.sub(r"\s*\(.*?\)", "", str(key))
                    target_attr = attr_by_norm.get(_normalize_key(k_no_unit))

                if target_attr:
                    val_str = str(val).strip()
                    existing_av = next(
                        (av for av in matched_variant.attribute_values if av.attribute_id == target_attr.id),
                        None,
                    )
                    if existing_av:
                        existing_av.value = val_str
                    else:
                        new_av = ProductVariantAttributeValue(
                            variant_id=matched_variant.id,
                            attribute_id=target_attr.id,
                            value=val_str,
                        )
                        self.repo.db.add(new_av)

            updated_items.append({
                "id": matched_variant.id,
                "name": matched_variant.name,
                "barcode": matched_variant.barcode,
            })

        self.repo.db.commit()

        for item in updated_items:
            v_obj = by_id.get(item["id"])
            if v_obj:
                try:
                    self.repo.db.refresh(v_obj)
                except Exception:
                    pass

        return {
            "total_processed": total_processed,
            "total_updated": len(updated_items),
            "total_failed": len(errors),
            "all_done": len(errors) == 0,
            "errors": errors,
            "updated_items": updated_items,
        }
