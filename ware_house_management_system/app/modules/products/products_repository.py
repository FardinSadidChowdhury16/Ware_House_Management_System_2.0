import logging
import re
from typing import List, Optional, Tuple
from sqlalchemy import or_, and_, cast, String
from sqlalchemy.orm import Session
from app.models.product import (
    Product,
    ProductType,
    ProductTypeAttribute,
    ProductVariant,
    ProductVariantAttributeValue,
    TaxRule,
)
from app.models.inventory import StockMovement, SerializedItem, BulkWarehouseStock, ItemStatus, MovementType
from app.models.warehouse import Warehouse
from app.models.party import Supplier, Customer
from app.models.access_control import User
from app.models.service import ServiceTicket
from app.schemas.product import (
    ProductCreate,
    ProductTypeCreate,
    ProductTypeUpdate,
    TaxRuleCreate,
)

logger = logging.getLogger(__name__)


def enrich_variants_with_warehouses(
    variants: List[ProductVariant],
    db: Session,
    allowed_warehouse_ids: Optional[List[int]] = None,
):
    if not variants:
        return
    variant_map = {v.id: set() for v in variants if v.id}
    barcode_to_id = {v.barcode: v.id for v in variants if v.barcode}
    variant_ids = list(variant_map.keys())

    s_conds = []
    if variant_ids:
        s_conds.append(SerializedItem.variant_id.in_(variant_ids))
    if barcode_to_id:
        s_conds.append(SerializedItem.barcode.in_(list(barcode_to_id.keys())))

    if s_conds:
        s_query = (
            db.query(SerializedItem.variant_id, SerializedItem.barcode, Warehouse.name)
            .join(Warehouse, SerializedItem.warehouse_id == Warehouse.id)
            .filter(or_(*s_conds))
        )
        if allowed_warehouse_ids is not None:
            s_query = s_query.filter(Warehouse.id.in_(allowed_warehouse_ids))
        s_items = s_query.all()
        for var_id, barcode, wh_name in s_items:
            if not wh_name:
                continue
            if var_id and var_id in variant_map:
                variant_map[var_id].add(wh_name)
            elif barcode and barcode in barcode_to_id:
                variant_map[barcode_to_id[barcode]].add(wh_name)

    if variant_ids:
        b_query = (
            db.query(BulkWarehouseStock.variant_id, Warehouse.name)
            .join(Warehouse, BulkWarehouseStock.warehouse_id == Warehouse.id)
            .filter(BulkWarehouseStock.variant_id.in_(variant_ids), BulkWarehouseStock.quantity > 0)
        )
        if allowed_warehouse_ids is not None:
            b_query = b_query.filter(Warehouse.id.in_(allowed_warehouse_ids))
        b_stocks = b_query.all()
        for var_id, wh_name in b_stocks:
            if var_id and var_id in variant_map and wh_name:
                variant_map[var_id].add(wh_name)

    for v in variants:
        whs = sorted(list(variant_map.get(v.id, set())))
        v.warehouse_name = ", ".join(whs) if whs else None
        v.assigned_warehouses = whs
        v.is_stocked_in = len(whs) > 0
        v.stock_status = "stocked_in" if len(whs) > 0 else "not_stocked_in"

    # Enrich with Stock Movements (Stock In, Stock Out, etc.) and Service Tickets
    var_si_ids = {v.id: set() for v in variants if v.id}
    var_barcodes = {v.id: set() for v in variants if v.id}
    for v in variants:
        if v.barcode:
            var_barcodes[v.id].add(v.barcode)

    all_barcodes = list(barcode_to_id.keys())
    s_id_to_var_id = {}
    s_barcode_to_var_id = {}

    si_query_conds = []
    if variant_ids:
        si_query_conds.append(SerializedItem.variant_id.in_(variant_ids))
    if all_barcodes:
        si_query_conds.append(SerializedItem.barcode.in_(all_barcodes))
        si_query_conds.append(SerializedItem.serial_number.in_(all_barcodes))

    var_has_sold_si = {}
    if si_query_conds:
        try:
            matched_sis = db.query(
                SerializedItem.id,
                SerializedItem.variant_id,
                SerializedItem.barcode,
                SerializedItem.serial_number,
                SerializedItem.status,
            ).filter(or_(*si_query_conds)).all()
            for si_id, si_var_id, si_barcode, si_sn, si_status in matched_sis:
                target_v_id = si_var_id if (si_var_id and si_var_id in variant_map) else (barcode_to_id.get(si_barcode) or barcode_to_id.get(si_sn))
                if target_v_id:
                    var_si_ids[target_v_id].add(si_id)
                    s_id_to_var_id[si_id] = target_v_id
                    if si_status == ItemStatus.SOLD or str(getattr(si_status, "value", si_status)).lower() == "sold":
                        var_has_sold_si[target_v_id] = True
                    if si_barcode:
                        var_barcodes[target_v_id].add(si_barcode)
                        s_barcode_to_var_id[si_barcode] = target_v_id
                    if si_sn:
                        var_barcodes[target_v_id].add(si_sn)
                        s_barcode_to_var_id[si_sn] = target_v_id
        except Exception as e:
            logger.warning(f"Error fetching serialized items for enrichment: {e}")

    all_si_ids = list(s_id_to_var_id.keys())
    m_conds = []
    if variant_ids:
        m_conds.append(StockMovement.variant_id.in_(variant_ids))
    if all_si_ids:
        m_conds.append(StockMovement.product_item_id.in_(all_si_ids))

    movements_by_var = {v.id: [] for v in variants if v.id}
    if m_conds:
        try:
            m_list = db.query(StockMovement).filter(or_(*m_conds)).order_by(StockMovement.created_at.desc()).all()
            wh_ids = {m.from_warehouse_id for m in m_list if m.from_warehouse_id} | {m.to_warehouse_id for m in m_list if m.to_warehouse_id}
            supp_ids = {m.supplier_id for m in m_list if m.supplier_id}
            cust_ids = {m.customer_id for m in m_list if m.customer_id}
            user_ids = {m.created_by for m in m_list if m.created_by}

            wh_map = {w[0]: w[1] for w in db.query(Warehouse.id, Warehouse.name).filter(Warehouse.id.in_(wh_ids)).all()} if wh_ids else {}
            supp_map = {s[0]: s[1] for s in db.query(Supplier.id, Supplier.name).filter(Supplier.id.in_(supp_ids)).all()} if supp_ids else {}
            cust_map = {c[0]: c[1] for c in db.query(Customer.id, Customer.name).filter(Customer.id.in_(cust_ids)).all()} if cust_ids else {}
            user_map = {u[0]: u[1] for u in db.query(User.id, User.name).filter(User.id.in_(user_ids)).all()} if user_ids else {}

            for m in m_list:
                target_v_id = m.variant_id if (m.variant_id and m.variant_id in variant_map) else s_id_to_var_id.get(m.product_item_id)
                if not target_v_id or target_v_id not in movements_by_var:
                    continue

                m_type = m.movement_type.value if hasattr(m.movement_type, "value") else str(m.movement_type)
                ref_num = None
                if m.reference_id:
                    ref_num = str(m.reference_id)
                elif m.note and "Ref:" in m.note:
                    m_match = re.search(r"Ref:\s*([^|]+)", m.note, re.IGNORECASE)
                    if m_match:
                        ref_num = m_match.group(1).strip()

                m_dict = {
                    "id": m.id,
                    "movement_type": m_type,
                    "movement_type_display": m_type.replace("_", " ").title(),
                    "quantity": m.quantity,
                    "from_warehouse_id": m.from_warehouse_id,
                    "from_warehouse_name": wh_map.get(m.from_warehouse_id),
                    "to_warehouse_id": m.to_warehouse_id,
                    "to_warehouse_name": wh_map.get(m.to_warehouse_id),
                    "warehouse_name": wh_map.get(m.to_warehouse_id) or wh_map.get(m.from_warehouse_id),
                    "supplier_id": m.supplier_id,
                    "supplier_name": supp_map.get(m.supplier_id),
                    "customer_id": m.customer_id,
                    "customer_name": cust_map.get(m.customer_id),
                    "party_name": supp_map.get(m.supplier_id) or cust_map.get(m.customer_id),
                    "reference_type": m.reference_type,
                    "reference_id": m.reference_id,
                    "reference_number": ref_num,
                    "note": m.note,
                    "attachment_url": getattr(m, "attachment_url", None),
                    "created_by": m.created_by,
                    "created_by_name": user_map.get(m.created_by),
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                movements_by_var[target_v_id].append(m_dict)
        except Exception as e:
            logger.warning(f"Error fetching movements for enrichment: {e}")

    tickets_by_var = {v.id: [] for v in variants if v.id}
    all_target_barcodes = set()
    for b_set in var_barcodes.values():
        all_target_barcodes.update(b_set)

    st_conds = []
    if variant_ids:
        st_conds.append(ServiceTicket.variant_id.in_(variant_ids))
    if all_target_barcodes:
        st_conds.append(ServiceTicket.barcode.in_(list(all_target_barcodes)))

    if st_conds:
        try:
            st_list = db.query(ServiceTicket).filter(or_(*st_conds)).order_by(ServiceTicket.created_at.desc()).all()
            for st in st_list:
                target_v_id = st.variant_id if (st.variant_id and st.variant_id in variant_map) else (s_barcode_to_var_id.get(st.barcode) or barcode_to_id.get(st.barcode))
                if not target_v_id or target_v_id not in tickets_by_var:
                    continue

                st_dict = {
                    "id": st.id,
                    "ticket_number": st.ticket_number,
                    "barcode": st.barcode,
                    "product_name": st.product_name,
                    "item_name": st.item_name,
                    "status": st.status.value if hasattr(st.status, "value") else str(st.status),
                    "status_display": (st.status.value if hasattr(st.status, "value") else str(st.status)).replace("_", " ").title(),
                    "customer_name": st.customer_name or (st.customer.name if st.customer else None),
                    "customer_phone": st.customer_phone or (st.customer.phone if st.customer else None),
                    "customer_address": st.customer_address,
                    "warehouse_name": st.warehouse.name if st.warehouse else None,
                    "issue_description": st.issue_description,
                    "repair_notes": st.repair_notes,
                    "received_date": st.received_date.isoformat() if st.received_date else None,
                    "delivered_date": st.delivered_date.isoformat() if st.delivered_date else None,
                    "delivered_by_name": st.delivered_by_user.name if st.delivered_by_user else None,
                    "attachment_url": getattr(st, "attachment_url", None),
                    "delivery_attachment_url": getattr(st, "delivery_attachment_url", None),
                    "created_at": st.created_at.isoformat() if st.created_at else None,
                }
                tickets_by_var[target_v_id].append(st_dict)
        except Exception as e:
            logger.warning(f"Error fetching service tickets for enrichment: {e}")

    for v in variants:
        var_movs = movements_by_var.get(v.id, [])
        var_tix = tickets_by_var.get(v.id, [])

        stock_ins = [
            m for m in var_movs
            if m["movement_type"] in ("purchase_in", "PURCHASE_IN")
            or "in" in m["movement_type"].lower()
        ]
        stock_in_with_attachment = next((m for m in stock_ins if m.get("attachment_url")), None)
        latest_stock_in = stock_in_with_attachment or (stock_ins[0] if stock_ins else None)

        stock_outs = [
            m for m in var_movs
            if m["movement_type"] in ("sale_out", "SALE_OUT")
            or "out" in m["movement_type"].lower()
        ]
        stock_out_with_attachment = next((m for m in stock_outs if m.get("attachment_url")), None)
        latest_stock_out = stock_out_with_attachment or (stock_outs[0] if stock_outs else None)

        # Refine stock_status to accurately reflect: stocked_in, sold, or not_stocked_in
        if v.is_stocked_in:
            v.stock_status = "stocked_in"
            v.is_stocked_in = True
            v.is_sold = False
        elif stock_outs or latest_stock_out or var_has_sold_si.get(v.id):
            v.stock_status = "sold"
            v.is_stocked_in = False
            v.is_sold = True
        else:
            v.stock_status = "not_stocked_in"
            v.is_stocked_in = False
            v.is_sold = False

        ticket_with_att = next((t for t in var_tix if t.get("delivery_attachment_url") or t.get("attachment_url")), None)
        latest_ticket = ticket_with_att or (var_tix[0] if var_tix else None)

        attachments_list = []
        seen_urls = set()

        def add_att(source_type, title, url, date_str, note, party, wh):
            if not url or url in seen_urls:
                return
            seen_urls.add(url)
            filename = url.split("?")[0].split("/")[-1]
            is_image = any(filename.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"))
            is_pdf = filename.lower().endswith(".pdf")
            attachments_list.append({
                "source": source_type,
                "title": title,
                "url": url,
                "filename": filename,
                "is_image": is_image,
                "is_pdf": is_pdf,
                "date": date_str,
                "note": note,
                "party": party,
                "warehouse": wh,
            })

        for m in var_movs:
            if m.get("attachment_url"):
                source_key = "stock_in" if "in" in m["movement_type"].lower() else ("stock_out" if "out" in m["movement_type"].lower() else "movement")
                title_lbl = f"{m.get('movement_type_display', 'Movement')} Attachment"
                add_att(
                    source_type=source_key,
                    title=title_lbl,
                    url=m["attachment_url"],
                    date_str=m.get("created_at"),
                    note=m.get("note"),
                    party=m.get("party_name"),
                    wh=m.get("warehouse_name"),
                )

        for t in var_tix:
            if t.get("attachment_url"):
                add_att(
                    source_type="service_intake",
                    title=f"Return Intake Attachment ({t['ticket_number']})",
                    url=t["attachment_url"],
                    date_str=t.get("received_date") or t.get("created_at"),
                    note=t.get("issue_description"),
                    party=t.get("customer_name"),
                    wh=t.get("warehouse_name"),
                )
            if t.get("delivery_attachment_url"):
                add_att(
                    source_type="service_delivery",
                    title=f"Return Delivery Proof ({t['ticket_number']})",
                    url=t["delivery_attachment_url"],
                    date_str=t.get("delivered_date"),
                    note=t.get("repair_notes") or f"Delivered to {t.get('customer_name', 'Customer')}",
                    party=t.get("customer_name"),
                    wh=t.get("warehouse_name"),
                )

        v.stock_in_details = latest_stock_in
        v.stock_out_details = latest_stock_out
        v.service_ticket_details = latest_ticket
        v.attachments = attachments_list
        v.movements = var_movs[:15]


class ProductsRepository:
    def __init__(self, db: Session):
        self.db = db

    # Product Types & Attributes
    def create_product_type(self, type_in: ProductTypeCreate) -> ProductType:
        product_type = ProductType(
            name=type_in.name,
            description=type_in.description,
            default_tracking_type=type_in.default_tracking_type,
        )
        self.db.add(product_type)
        self.db.flush()

        if type_in.attributes:
            for attr in type_in.attributes:
                db_attr = ProductTypeAttribute(
                    product_type_id=product_type.id,
                    **attr.model_dump()
                )
                self.db.add(db_attr)

        self.db.commit()
        self.db.refresh(product_type)
        return product_type

    def get_all_product_types(self) -> List[ProductType]:
        return self.db.query(ProductType).all()

    def get_product_type_by_id(self, product_type_id: int) -> Optional[ProductType]:
        return self.db.query(ProductType).filter(ProductType.id == product_type_id).first()

    def update_product_type(self, product_type_id: int, update_data: dict) -> Optional[ProductType]:
        product_type = self.get_product_type_by_id(product_type_id)
        if not product_type:
            return None

        for field, value in update_data.items():
            if field == "attributes":
                continue
            if value is not None:
                setattr(product_type, field, value)

        if update_data.get("attributes") is not None:
            self.db.query(ProductTypeAttribute).filter(
                ProductTypeAttribute.product_type_id == product_type.id
            ).delete()
            for attr in update_data["attributes"]:
                attr_data = attr.model_dump() if hasattr(attr, "model_dump") else dict(attr)
                self.db.add(
                    ProductTypeAttribute(
                        product_type_id=product_type.id,
                        **attr_data,
                    )
                )

        self.db.commit()
        self.db.refresh(product_type)
        return product_type

    def delete_product_type(self, product_type_id: int) -> Optional[ProductType]:
        product_type = self.get_product_type_by_id(product_type_id)
        if not product_type:
            return None

        self.db.delete(product_type)
        self.db.commit()
        return product_type

    # Tax Rules
    def create_tax_rule(self, tax_in: TaxRuleCreate) -> TaxRule:
        tax_rule = TaxRule(**tax_in.model_dump())
        self.db.add(tax_rule)
        self.db.commit()
        self.db.refresh(tax_rule)
        return tax_rule

    def get_all_tax_rules(self) -> List[TaxRule]:
        return self.db.query(TaxRule).all()

    def get_tax_rule_by_id(self, tax_id: int) -> Optional[TaxRule]:
        return self.db.query(TaxRule).filter(TaxRule.id == tax_id).first()

    def update_tax_rule(self, tax_id: int, update_data: dict) -> Optional[TaxRule]:
        tax_rule = self.get_tax_rule_by_id(tax_id)
        if not tax_rule:
            return None
        for field, value in update_data.items():
            if value is not None:
                setattr(tax_rule, field, value)
        self.db.commit()
        self.db.refresh(tax_rule)
        return tax_rule

    def delete_tax_rule(self, tax_id: int) -> Optional[TaxRule]:
        tax_rule = self.get_tax_rule_by_id(tax_id)
        if not tax_rule:
            return None
        self.db.delete(tax_rule)
        self.db.commit()
        return tax_rule

    # Products & Variants
    def get_product_by_code(self, product_code: str) -> Optional[Product]:
        return self.db.query(Product).filter(Product.product_code == product_code).first()

    def get_product_by_id(self, product_id: int) -> Optional[Product]:
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if product and product.variants:
            enrich_variants_with_warehouses(product.variants, self.db)
        return product

    def get_variant_by_id(self, variant_id: int) -> Optional[ProductVariant]:
        v = self.db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
        if v:
            enrich_variants_with_warehouses([v], self.db)
        return v

    def get_product_variant(self, product_id: int, variant_id: int) -> Optional[ProductVariant]:
        v = self.db.query(ProductVariant).filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        ).first()
        if v:
            enrich_variants_with_warehouses([v], self.db)
        return v

    def create_product_with_variants(self, product_in: ProductCreate) -> Product:
        product = Product(
            name=product_in.name,
            product_code=product_in.product_code,
            category_id=product_in.category_id,
            tracking_type=product_in.tracking_type,
            min_stock_level=product_in.min_stock_level,
            status=product_in.status,
        )
        self.db.add(product)
        self.db.flush()

        if product_in.variants:
            for v_in in product_in.variants:
                bc = str(v_in.barcode).strip() if (v_in.barcode and str(v_in.barcode).strip()) else self.generate_unique_barcode()
                variant = ProductVariant(
                    product_id=product.id,
                    sku=v_in.sku,
                    name=v_in.name,
                    barcode=bc,
                    cost_price=v_in.cost_price,
                    selling_price=v_in.selling_price,
                    status=v_in.status,
                )
                self.db.add(variant)
                self.db.flush()

                if v_in.attribute_values:
                    for attr_val in v_in.attribute_values:
                        db_val = ProductVariantAttributeValue(
                            variant_id=variant.id,
                            attribute_id=attr_val.attribute_id,
                            value=attr_val.value,
                        )
                        self.db.add(db_val)

                if v_in.tax_rule_ids:
                    taxes = self.db.query(TaxRule).filter(TaxRule.id.in_(v_in.tax_rule_ids)).all()
                    variant.taxes.extend(taxes)

        self.db.commit()
        self.db.refresh(product)
        return product

    def get_products(self, skip: int = 0, limit: int = 100) -> List[Product]:
        return self.db.query(Product).offset(skip).limit(limit).all()

    def get_products_paginated(
        self,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        tracking: Optional[str] = None,
        status: Optional[str] = None,
        stock_status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ) -> Tuple[List[Product], int]:
        query = self.db.query(Product)
        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(or_(Product.name.ilike(s), Product.product_code.ilike(s)))
        if tracking and tracking.lower() != "all":
            query = query.filter(Product.tracking_type == tracking.lower())
        if status and status.lower() != "all":
            query = query.filter(Product.status == status.lower())

        if warehouse_id is not None:
            s_wh = self.db.query(SerializedItem.id).filter(
                SerializedItem.product_id == Product.id,
                SerializedItem.warehouse_id == warehouse_id,
            )
            b_wh = self.db.query(BulkWarehouseStock.id).filter(
                BulkWarehouseStock.product_id == Product.id,
                BulkWarehouseStock.warehouse_id == warehouse_id,
                BulkWarehouseStock.quantity > 0,
            )
            if allowed_warehouse_ids is not None:
                # Non-admin user: include target warehouse stock + unassigned products
                s_unassigned = self.db.query(SerializedItem.id).filter(
                    SerializedItem.product_id == Product.id,
                    SerializedItem.warehouse_id.is_(None),
                )
                s_any_wh = self.db.query(SerializedItem.id).filter(
                    SerializedItem.variant_id == ProductVariant.id,
                    SerializedItem.warehouse_id.isnot(None),
                )
                b_any_wh = self.db.query(BulkWarehouseStock.id).filter(
                    BulkWarehouseStock.variant_id == ProductVariant.id,
                    BulkWarehouseStock.warehouse_id.isnot(None),
                    BulkWarehouseStock.quantity > 0,
                )
                v_unassigned = self.db.query(ProductVariant.id).filter(
                    ProductVariant.product_id == Product.id,
                    ~or_(s_any_wh.exists(), b_any_wh.exists()),
                )
                has_no_variants = ~self.db.query(ProductVariant.id).filter(ProductVariant.product_id == Product.id).exists()
                query = query.filter(
                    or_(
                        s_wh.exists(),
                        b_wh.exists(),
                        s_unassigned.exists(),
                        v_unassigned.exists(),
                        has_no_variants,
                    )
                )
            else:
                query = query.filter(or_(s_wh.exists(), b_wh.exists()))
        elif allowed_warehouse_ids is not None:
            s_assigned = self.db.query(SerializedItem.id).filter(
                SerializedItem.product_id == Product.id,
                SerializedItem.warehouse_id.in_(allowed_warehouse_ids),
            )
            b_assigned = self.db.query(BulkWarehouseStock.id).filter(
                BulkWarehouseStock.product_id == Product.id,
                BulkWarehouseStock.warehouse_id.in_(allowed_warehouse_ids),
                BulkWarehouseStock.quantity > 0,
            )
            s_unassigned = self.db.query(SerializedItem.id).filter(
                SerializedItem.product_id == Product.id,
                SerializedItem.warehouse_id.is_(None),
            )
            s_any_wh = self.db.query(SerializedItem.id).filter(
                SerializedItem.variant_id == ProductVariant.id,
                SerializedItem.warehouse_id.isnot(None),
            )
            b_any_wh = self.db.query(BulkWarehouseStock.id).filter(
                BulkWarehouseStock.variant_id == ProductVariant.id,
                BulkWarehouseStock.warehouse_id.isnot(None),
                BulkWarehouseStock.quantity > 0,
            )
            v_unassigned = self.db.query(ProductVariant.id).filter(
                ProductVariant.product_id == Product.id,
                ~or_(s_any_wh.exists(), b_any_wh.exists()),
            )
            has_no_variants = ~self.db.query(ProductVariant.id).filter(ProductVariant.product_id == Product.id).exists()

            can_see_product = or_(
                s_assigned.exists(),
                b_assigned.exists(),
                s_unassigned.exists(),
                v_unassigned.exists(),
                has_no_variants,
            )
            query = query.filter(can_see_product)

        if stock_status and stock_status.lower() not in ("all", ""):
            s_exists = self.db.query(SerializedItem.id).filter(
                SerializedItem.product_id == Product.id,
                SerializedItem.warehouse_id.isnot(None),
            )
            b_exists = self.db.query(BulkWarehouseStock.id).filter(
                BulkWarehouseStock.product_id == Product.id,
                BulkWarehouseStock.warehouse_id.isnot(None),
                BulkWarehouseStock.quantity > 0,
            )
            is_stocked_condition = or_(s_exists.exists(), b_exists.exists())

            sold_s_exists = self.db.query(SerializedItem.id).filter(
                SerializedItem.product_id == Product.id,
                SerializedItem.status == ItemStatus.SOLD,
            )
            sold_m_exists = self.db.query(StockMovement.id).filter(
                StockMovement.product_id == Product.id,
                or_(
                    StockMovement.movement_type == MovementType.SALE_OUT,
                    cast(StockMovement.movement_type, String).in_(["sale_out", "SALE_OUT"]),
                ),
            )
            has_sold_condition = and_(~is_stocked_condition, or_(sold_s_exists.exists(), sold_m_exists.exists()))

            if stock_status.lower() in ("stocked_in", "in_stock"):
                query = query.filter(is_stocked_condition)
            elif stock_status.lower() in ("sold", "is_sold"):
                query = query.filter(has_sold_condition)
            elif stock_status.lower() in ("not_stocked_in", "not_in_stock", "pending_stock"):
                query = query.filter(and_(~is_stocked_condition, ~or_(sold_s_exists.exists(), sold_m_exists.exists())))

        total = query.count()
        items = query.order_by(Product.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

        all_variants = []
        for p in items:
            if p.variants:
                all_variants.extend(p.variants)
        if all_variants:
            enrich_variants_with_warehouses(all_variants, self.db, allowed_warehouse_ids=allowed_warehouse_ids)

        return items, total

    def get_variants_paginated(
        self,
        product_id: int,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        stock_status: Optional[str] = None,
        allowed_warehouse_ids: Optional[List[int]] = None,
    ) -> Tuple[List[ProductVariant], int]:
        query = self.db.query(ProductVariant).filter(ProductVariant.product_id == product_id)
        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    ProductVariant.sku.ilike(s),
                    ProductVariant.name.ilike(s),
                    ProductVariant.barcode.ilike(s),
                    cast(ProductVariant.cost_price, String).ilike(s),
                    cast(ProductVariant.selling_price, String).ilike(s),
                    cast(ProductVariant.status, String).ilike(s),
                    ProductVariant.attribute_values.any(ProductVariantAttributeValue.value.ilike(s)),
                    ProductVariant.taxes.any(TaxRule.name.ilike(s)),
                )
            )
        if status and status.lower() != "all":
            query = query.filter(ProductVariant.status == status.lower())

        # Subqueries for identifying stock in ANY warehouse
        s_any_subq = self.db.query(SerializedItem.variant_id).filter(
            SerializedItem.warehouse_id.isnot(None),
            SerializedItem.variant_id.isnot(None),
        )
        s_any_barcodes = self.db.query(SerializedItem.barcode).filter(
            SerializedItem.warehouse_id.isnot(None),
            SerializedItem.barcode.isnot(None),
        )
        b_any_subq = self.db.query(BulkWarehouseStock.variant_id).filter(
            BulkWarehouseStock.warehouse_id.isnot(None),
            BulkWarehouseStock.quantity > 0,
            BulkWarehouseStock.variant_id.isnot(None),
        )
        is_in_any_wh = or_(
            ProductVariant.id.in_(s_any_subq),
            ProductVariant.barcode.in_(s_any_barcodes),
            ProductVariant.id.in_(b_any_subq),
        )
        is_unassigned = ~is_in_any_wh

        s_sold_subq = self.db.query(SerializedItem.variant_id).filter(
            SerializedItem.status == ItemStatus.SOLD,
            SerializedItem.variant_id.isnot(None),
        )
        s_sold_barcodes = self.db.query(SerializedItem.barcode).filter(
            SerializedItem.status == ItemStatus.SOLD,
            SerializedItem.barcode.isnot(None),
        )
        m_sold_subq = self.db.query(StockMovement.variant_id).filter(
            or_(
                StockMovement.movement_type == MovementType.SALE_OUT,
                cast(StockMovement.movement_type, String).in_(["sale_out", "SALE_OUT"]),
            ),
            StockMovement.variant_id.isnot(None),
        )
        is_sold = and_(
            is_unassigned,
            or_(
                ProductVariant.id.in_(s_sold_subq),
                ProductVariant.barcode.in_(s_sold_barcodes),
                ProductVariant.id.in_(m_sold_subq),
            ),
        )

        # Warehouse filter / scoping:
        if allowed_warehouse_ids is not None:
            # Non-admin user
            target_ids = [warehouse_id] if warehouse_id is not None else allowed_warehouse_ids

            s_assigned_subq = self.db.query(SerializedItem.variant_id).filter(
                SerializedItem.warehouse_id.in_(target_ids),
                SerializedItem.variant_id.isnot(None),
            )
            s_assigned_barcodes = self.db.query(SerializedItem.barcode).filter(
                SerializedItem.warehouse_id.in_(target_ids),
                SerializedItem.barcode.isnot(None),
            )
            b_assigned_subq = self.db.query(BulkWarehouseStock.variant_id).filter(
                BulkWarehouseStock.warehouse_id.in_(target_ids),
                BulkWarehouseStock.quantity > 0,
                BulkWarehouseStock.variant_id.isnot(None),
            )
            is_in_target_wh = or_(
                ProductVariant.id.in_(s_assigned_subq),
                ProductVariant.barcode.in_(s_assigned_barcodes),
                ProductVariant.id.in_(b_assigned_subq),
            )

            # Allowed: Variants in target warehouses + UNASSIGNED variants (not in any warehouse)
            query = query.filter(or_(is_in_target_wh, is_unassigned))
        elif warehouse_id is not None:
            # Admin user filtered by warehouse
            if stock_status and stock_status.lower() in ("sold", "is_sold"):
                m_wh_sold = self.db.query(StockMovement.variant_id).filter(
                    StockMovement.from_warehouse_id == warehouse_id,
                    or_(
                        StockMovement.movement_type == MovementType.SALE_OUT,
                        cast(StockMovement.movement_type, String).in_(["sale_out", "SALE_OUT"]),
                    ),
                    StockMovement.variant_id.isnot(None),
                )
                query = query.filter(ProductVariant.id.in_(m_wh_sold))
            elif stock_status and stock_status.lower() in ("not_stocked_in", "not_in_stock", "pending_stock"):
                query = query.filter(and_(is_unassigned, ~is_sold))
            else:
                s_subq = self.db.query(SerializedItem.variant_id).filter(
                    SerializedItem.warehouse_id == warehouse_id,
                    SerializedItem.variant_id.isnot(None)
                )
                b_subq = self.db.query(BulkWarehouseStock.variant_id).filter(
                    BulkWarehouseStock.warehouse_id == warehouse_id,
                    BulkWarehouseStock.quantity > 0,
                    BulkWarehouseStock.variant_id.isnot(None)
                )
                s_barcodes = self.db.query(SerializedItem.barcode).filter(
                    SerializedItem.warehouse_id == warehouse_id,
                    SerializedItem.barcode.isnot(None)
                )
                query = query.filter(
                    or_(
                        ProductVariant.id.in_(s_subq),
                        ProductVariant.id.in_(b_subq),
                        ProductVariant.barcode.in_(s_barcodes),
                    )
                )

        # Stock status filter:
        if stock_status and stock_status.lower() not in ("all", ""):
            if stock_status.lower() in ("stocked_in", "in_stock"):
                if allowed_warehouse_ids is not None:
                    query = query.filter(is_in_target_wh)
                elif warehouse_id is not None:
                    # Already filtered by warehouse above
                    pass
                else:
                    query = query.filter(is_in_any_wh)
            elif stock_status.lower() in ("sold", "is_sold"):
                if warehouse_id is None:
                    query = query.filter(is_sold)
            elif stock_status.lower() in ("not_stocked_in", "not_in_stock", "pending_stock"):
                query = query.filter(and_(is_unassigned, ~is_sold))

        total = query.count()
        items = query.order_by(ProductVariant.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
        enrich_variants_with_warehouses(items, self.db, allowed_warehouse_ids=allowed_warehouse_ids)
        return items, total

    def update_product(self, product_id: int, update_data: dict) -> Optional[Product]:
        product = self.get_product_by_id(product_id)
        if not product:
            return None
        for field, value in update_data.items():
            if value is not None:
                setattr(product, field, value)
        self.db.commit()
        self.db.refresh(product)
        return product

    def has_stock_movements(self, product_id: int) -> int:
        """Return count of stock movements referencing this product."""
        return (
            self.db.query(StockMovement)
            .filter(StockMovement.product_id == product_id)
            .count()
        )

    def delete_product(self, product_id: int) -> Optional[Product]:
        product = self.get_product_by_id(product_id)
        if not product:
            return None
        self.db.delete(product)
        self.db.commit()
        return product

    def generate_unique_barcode(self) -> str:
        import time, random
        while True:
            ts_part = str(int(time.time() * 1000))[-9:]
            rand_part = str(random.randint(100, 999))
            base12 = ts_part + rand_part
            odd_sum = sum(int(base12[i]) for i in range(0, 12, 2))
            even_sum = sum(int(base12[i]) for i in range(1, 12, 2))
            check = (10 - ((odd_sum + even_sum * 3) % 10)) % 10
            candidate = base12 + str(check)
            if not self.get_variant_by_barcode(candidate):
                return candidate

    def get_variant_by_barcode(self, barcode: str) -> Optional[ProductVariant]:
        return self.db.query(ProductVariant).filter(ProductVariant.barcode == barcode).first()

    def create_variant(self, product_id: int, variant_data: dict) -> ProductVariant:
        if not variant_data.get("barcode") or not str(variant_data.get("barcode")).strip():
            variant_data["barcode"] = self.generate_unique_barcode()
        db_variant = ProductVariant(product_id=product_id, **variant_data)
        self.db.add(db_variant)
        self.db.commit()
        self.db.refresh(db_variant)
        return db_variant

    def create_variant_attributes(self, variant_id: int, attribute_values: list):
        for attr in attribute_values:
            attr_val = ProductVariantAttributeValue(
                variant_id=variant_id,
                attribute_id=attr.attribute_id,
                value=attr.value,
            )
            self.db.add(attr_val)
        self.db.commit()

    def update_variant(self, product_id: int, variant_id: int, update_data: dict) -> Optional[ProductVariant]:
        variant = self.get_product_variant(product_id, variant_id)
        if not variant:
            return None

        for field, value in update_data.items():
            if value is not None:
                setattr(variant, field, value)

        self.db.commit()
        self.db.refresh(variant)
        return variant

    def delete_variant(self, product_id: int, variant_id: int) -> Optional[ProductVariant]:
        variant = self.get_product_variant(product_id, variant_id)
        if not variant:
            return None
        self.db.delete(variant)
        self.db.commit()
        return variant

    def update_variant_price(self, variant_id: int, cost_price: Optional[float] = None, selling_price: Optional[float] = None) -> ProductVariant:
        variant = self.get_variant_by_id(variant_id)
        if not variant:
            return None

        if cost_price is not None:
            variant.cost_price = cost_price
        if selling_price is not None:
            variant.selling_price = selling_price

        self.db.commit()
        self.db.refresh(variant)
        return variant