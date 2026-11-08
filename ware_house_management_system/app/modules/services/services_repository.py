from typing import List, Optional
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session
from app.models.service import (
    SerializedWarrantyClaim,
    SerializedServiceRecord,
    ClaimStatus,
    ServiceTicket,
    ServiceTicketStatus,
)
from app.schemas.service import (
    WarrantyClaimCreate,
    WarrantyClaimUpdate,
    ServiceRecordCreate,
    ServiceTicketCreate,
    ServiceTicketUpdate,
)


class ServicesRepository:
    def __init__(self, db: Session):
        self.db = db

    # Warranty Claims
    def create_claim(self, claim_in: WarrantyClaimCreate) -> SerializedWarrantyClaim:
        claim = SerializedWarrantyClaim(**claim_in.model_dump())
        self.db.add(claim)
        self.db.commit()
        self.db.refresh(claim)
        return claim

    def get_claim_by_id(self, claim_id: int) -> Optional[SerializedWarrantyClaim]:
        return self.db.query(SerializedWarrantyClaim).filter(SerializedWarrantyClaim.id == claim_id).first()

    def update_claim(self, claim: SerializedWarrantyClaim, claim_in: WarrantyClaimUpdate) -> SerializedWarrantyClaim:
        update_data = claim_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(claim, field, value)

        if claim_in.status in [ClaimStatus.APPROVED, ClaimStatus.REJECTED, ClaimStatus.RESOLVED]:
            claim.resolved_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(claim)
        return claim

    def get_all_claims(self) -> List[SerializedWarrantyClaim]:
        return self.db.query(SerializedWarrantyClaim).all()

    # Service Records
    def create_record(self, record_in: ServiceRecordCreate) -> SerializedServiceRecord:
        record = SerializedServiceRecord(**record_in.model_dump())
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_all_records(self) -> List[SerializedServiceRecord]:
        return self.db.query(SerializedServiceRecord).all()

    # Product Item Warranties
    def get_warranties_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        expire_from: Optional[date] = None,
        expire_to: Optional[date] = None,
        warehouse_id: Optional[int] = None,
    ):
        from app.models.product import Product, ProductVariant
        from app.models.inventory import SerializedItem, StockMovement, BulkWarehouseStock
        from app.models.party import Customer
        from datetime import date
        from sqlalchemy import or_

        today = date.today()
        query = self.db.query(ProductVariant).join(Product, Product.id == ProductVariant.product_id)

        if search and search.strip():
            pat = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    ProductVariant.barcode.ilike(pat),
                    ProductVariant.sku.ilike(pat),
                    ProductVariant.name.ilike(pat),
                    Product.name.ilike(pat),
                    Product.product_code.ilike(pat),
                )
            )

        if expire_from:
            query = query.filter(ProductVariant.warranty_end_date >= expire_from)
        if expire_to:
            query = query.filter(ProductVariant.warranty_end_date <= expire_to)

        all_matching = query.order_by(ProductVariant.id.desc()).all()

        if warehouse_id is not None:
            wh_s_filter = (
                SerializedItem.warehouse_id.in_(warehouse_id)
                if isinstance(warehouse_id, (list, tuple, set))
                else (SerializedItem.warehouse_id == warehouse_id)
            )
            wh_b_filter = (
                BulkWarehouseStock.warehouse_id.in_(warehouse_id)
                if isinstance(warehouse_id, (list, tuple, set))
                else (BulkWarehouseStock.warehouse_id == warehouse_id)
            )
            s_var_ids = [
                r[0]
                for r in self.db.query(SerializedItem.variant_id)
                .filter(wh_s_filter)
                .distinct()
                .all()
                if r[0]
            ]
            s_barcodes = [
                r[0]
                for r in self.db.query(SerializedItem.barcode)
                .filter(wh_s_filter, SerializedItem.barcode.isnot(None))
                .distinct()
                .all()
                if r[0]
            ]
            b_var_ids = [
                r[0]
                for r in self.db.query(BulkWarehouseStock.variant_id)
                .filter(wh_b_filter, BulkWarehouseStock.quantity > 0)
                .distinct()
                .all()
                if r[0]
            ]
            allowed_v_ids = set(s_var_ids + b_var_ids)
            allowed_barcodes = set(s_barcodes)
            all_matching = [
                v for v in all_matching
                if v.id in allowed_v_ids or (v.barcode and v.barcode in allowed_barcodes)
            ]

        items = []
        stats = {
            "total": 0,
            "active": 0,
            "expired": 0,
            "no_warranty": 0,
        }

        for v in all_matching:
            p_name = v.product.name if v.product else None
            p_code = v.product.product_code if v.product else None
            start_d = v.warranty_start_date
            end_d = v.warranty_end_date

            remain = None
            item_status = "no_warranty"
            if end_d:
                diff = (end_d - today).days
                if diff < 0:
                    remain = 0
                    item_status = "expired"
                else:
                    remain = diff
                    item_status = "active"

            # Check if any customer is linked
            cust = (
                self.db.query(Customer)
                .join(SerializedItem, SerializedItem.customer_id == Customer.id)
                .filter(SerializedItem.variant_id == v.id)
                .first()
            )

            if not cust:
                mov = (
                    self.db.query(StockMovement)
                    .filter(
                        StockMovement.variant_id == v.id,
                        StockMovement.customer_id.isnot(None),
                    )
                    .order_by(StockMovement.created_at.desc())
                    .first()
                )
                if mov and mov.customer_id:
                    cust = self.db.query(Customer).filter(Customer.id == mov.customer_id).first()

            cust_name = cust.name if cust else None

            # Calculate stats across all matched records
            stats["total"] += 1
            if item_status in stats:
                stats[item_status] += 1

            # Filter by status if specified
            if status and status.lower() != "all":
                filter_key = status.lower().replace("-", "_").replace(" ", "_")
                if filter_key != item_status:
                    continue

            items.append({
                "id": v.id,
                "product_id": v.product_id,
                "product_name": p_name,
                "product_code": p_code,
                "item": v.name or v.sku or None,
                "sku": v.sku,
                "barcode": v.barcode,
                "start_date": start_d,
                "end_date": end_d,
                "remain_days": remain,
                "status": item_status,
                "customer_name": cust_name,
            })

        total = len(items)
        import math
        total_pages = max(1, math.ceil(total / page_size))
        offset = (page - 1) * page_size
        paged_items = items[offset : offset + page_size]

        return {
            "items": paged_items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "stats": stats,
        }

    @staticmethod
    def _to_utc(dt):
        if dt is None:
            return None
        if getattr(dt, 'tzinfo', None) is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def format_ticket_dict(ticket: ServiceTicket):
        return {
            "id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "barcode": ticket.barcode,
            "product_id": ticket.product_id,
            "variant_id": ticket.variant_id,
            "product_name": ticket.product_name,
            "item_name": ticket.item_name,
            "warehouse_id": ticket.warehouse_id,
            "warehouse_name": ticket.warehouse.name if ticket.warehouse else None,
            "customer_id": ticket.customer_id,
            "customer_name": ticket.customer_name,
            "customer_phone": ticket.customer_phone,
            "customer_address": ticket.customer_address or (ticket.customer.shipping_details if ticket.customer else None) or (ticket.customer.billing_details if ticket.customer else None),
            "issue_description": ticket.issue_description,
            "estimated_time": ticket.estimated_time,
            "estimated_completion_date": ticket.estimated_completion_date,
            "status": ticket.status,
            "repair_notes": ticket.repair_notes,
            "cost": float(ticket.cost or 0.0),
            "received_date": ticket.received_date,
            "started_at": ServicesRepository._to_utc(ticket.started_at),
            "started_by": ticket.started_by,
            "started_by_name": ticket.started_by_user.name if ticket.started_by_user else None,
            "completed_date": ServicesRepository._to_utc(ticket.completed_date),
            "completed_by": ticket.completed_by,
            "completed_by_name": ticket.completed_by_user.name if ticket.completed_by_user else None,
            "delivered_date": ServicesRepository._to_utc(ticket.delivered_date),
            "delivered_by": ticket.delivered_by,
            "delivered_by_name": ticket.delivered_by_user.name if ticket.delivered_by_user else None,
            "attachment_url": getattr(ticket, "attachment_url", None),
            "delivery_attachment_url": getattr(ticket, "delivery_attachment_url", None),
            "created_by": ticket.created_by,
            "created_by_name": ticket.creator.name if ticket.creator else None,
            "created_at": ServicesRepository._to_utc(ticket.created_at),
            "updated_at": ServicesRepository._to_utc(ticket.updated_at),
        }

    # Service Tickets
    def create_ticket(self, ticket_in: ServiceTicketCreate, user_id: Optional[int] = None):
        from app.models.party import Customer
        year = datetime.utcnow().year
        ticket_count = self.db.query(ServiceTicket).count() + 1
        ticket_number = f"SRV-{year}-{ticket_count:04d}"
        while self.db.query(ServiceTicket).filter(ServiceTicket.ticket_number == ticket_number).first():
            ticket_count += 1
            ticket_number = f"SRV-{year}-{ticket_count:04d}"

        data = ticket_in.model_dump()
        data["ticket_number"] = ticket_number
        data["created_by"] = user_id

        if data.get("customer_id"):
            cust = self.db.query(Customer).filter(Customer.id == data["customer_id"]).first()
            if cust:
                if not data.get("customer_name"):
                    data["customer_name"] = cust.name
                if not data.get("customer_phone"):
                    data["customer_phone"] = cust.phone
                if not data.get("customer_address"):
                    data["customer_address"] = cust.shipping_details or cust.billing_details

        if data.get("status") == ServiceTicketStatus.ON_REPAIRING:
            data["started_at"] = datetime.utcnow()
            data["started_by"] = user_id

        ticket = ServiceTicket(**data)
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)
        return self.format_ticket_dict(ticket)

    def get_ticket_raw(self, ticket_id: int) -> Optional[ServiceTicket]:
        return self.db.query(ServiceTicket).filter(ServiceTicket.id == ticket_id).first()

    def get_ticket_by_id(self, ticket_id: int):
        ticket = self.get_ticket_raw(ticket_id)
        return self.format_ticket_dict(ticket) if ticket else None

    def delete_ticket(self, ticket: ServiceTicket):
        self.db.delete(ticket)
        self.db.commit()
        return True

    def update_ticket(self, ticket: ServiceTicket, ticket_in: ServiceTicketUpdate, user_id: Optional[int] = None):
        prev_status = ticket.status
        update_data = ticket_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(ticket, field, value)

        new_status = ticket.status

        # If status transitioned, record audit user and timestamp from current login session!
        if new_status != prev_status or "status" in update_data:
            now_utc = datetime.utcnow()
            if new_status == ServiceTicketStatus.ON_REPAIRING:
                if not ticket.started_at:
                    ticket.started_at = now_utc
                if user_id and not ticket.started_by:
                    ticket.started_by = user_id

            elif new_status == ServiceTicketStatus.WORK_FINISH:
                if not ticket.started_at:
                    ticket.started_at = ticket.created_at or now_utc
                    if user_id and not ticket.started_by:
                        ticket.started_by = user_id
                if not ticket.completed_date:
                    ticket.completed_date = now_utc
                if user_id and not ticket.completed_by:
                    ticket.completed_by = user_id

            elif new_status == ServiceTicketStatus.DELIVERED:
                if not ticket.started_at:
                    ticket.started_at = ticket.created_at or now_utc
                    if user_id and not ticket.started_by:
                        ticket.started_by = user_id
                if not ticket.completed_date:
                    ticket.completed_date = now_utc
                    if user_id and not ticket.completed_by:
                        ticket.completed_by = user_id
                if not ticket.delivered_date:
                    ticket.delivered_date = now_utc
                if user_id and not ticket.delivered_by:
                    ticket.delivered_by = user_id

        self.db.commit()
        self.db.refresh(ticket)
        return self.format_ticket_dict(ticket)

    def _apply_ticket_identity(self, query, product_id=None, barcode=None, name=None):
        from sqlalchemy import or_

        if product_id is not None:
            query = query.filter(ServiceTicket.product_id == product_id)
        if barcode and str(barcode).strip():
            pat = f"%{str(barcode).strip()}%"
            query = query.filter(
                or_(
                    ServiceTicket.barcode.ilike(pat),
                    ServiceTicket.item_name.ilike(pat),
                )
            )
        if name and str(name).strip():
            pat = f"%{str(name).strip()}%"
            query = query.filter(
                or_(
                    ServiceTicket.product_name.ilike(pat),
                    ServiceTicket.item_name.ilike(pat),
                    ServiceTicket.customer_name.ilike(pat),
                )
            )
        return query

    def _apply_ticket_date_range(self, query, date_from=None, date_to=None):
        if date_from is None and date_to is None:
            return query
        from sqlalchemy import and_, or_, cast, Date

        columns = [
            ServiceTicket.received_date,
            cast(ServiceTicket.started_at, Date),
            cast(ServiceTicket.completed_date, Date),
            cast(ServiceTicket.delivered_date, Date),
        ]
        clauses = []
        for column in columns:
            parts = []
            if date_from is not None:
                parts.append(column >= date_from)
            if date_to is not None:
                parts.append(column <= date_to)
            clauses.append(and_(*parts))
        return query.filter(or_(*clauses))

    def get_tickets_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        date_from=None,
        date_to=None,
        product_id=None,
        barcode=None,
        name=None,
    ):
        from sqlalchemy import or_
        from app.models.warehouse import Warehouse
        import math

        all_tickets_q = self.db.query(ServiceTicket)
        if warehouse_id is not None:
            if isinstance(warehouse_id, (list, tuple, set)):
                all_tickets_q = all_tickets_q.filter(ServiceTicket.warehouse_id.in_(warehouse_id))
            else:
                all_tickets_q = all_tickets_q.filter(ServiceTicket.warehouse_id == warehouse_id)
        all_tickets_q = self._apply_ticket_date_range(all_tickets_q, date_from, date_to)
        all_tickets_q = self._apply_ticket_identity(all_tickets_q, product_id, barcode, name)
        all_tickets = all_tickets_q.all()
        stats = {
            "total": len(all_tickets),
            "idle": sum(1 for t in all_tickets if str(t.status.value if hasattr(t.status, 'value') else t.status) == "idle"),
            "on_repairing": sum(1 for t in all_tickets if str(t.status.value if hasattr(t.status, 'value') else t.status) == "on_repairing"),
            "work_finish": sum(1 for t in all_tickets if str(t.status.value if hasattr(t.status, 'value') else t.status) == "work_finish"),
            "delivered": sum(1 for t in all_tickets if str(t.status.value if hasattr(t.status, 'value') else t.status) == "delivered"),
        }

        query = self.db.query(ServiceTicket).outerjoin(Warehouse, Warehouse.id == ServiceTicket.warehouse_id)
        if warehouse_id is not None:
            if isinstance(warehouse_id, (list, tuple, set)):
                query = query.filter(ServiceTicket.warehouse_id.in_(warehouse_id))
            else:
                query = query.filter(ServiceTicket.warehouse_id == warehouse_id)
        query = self._apply_ticket_date_range(query, date_from, date_to)
        query = self._apply_ticket_identity(query, product_id, barcode, name)

        if search and search.strip():
            pat = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    ServiceTicket.ticket_number.ilike(pat),
                    ServiceTicket.barcode.ilike(pat),
                    ServiceTicket.product_name.ilike(pat),
                    ServiceTicket.item_name.ilike(pat),
                    ServiceTicket.customer_name.ilike(pat),
                    ServiceTicket.customer_phone.ilike(pat),
                    ServiceTicket.issue_description.ilike(pat),
                    Warehouse.name.ilike(pat),
                )
            )

        if status and status.lower() != "all":
            clean_status = status.lower().strip()
            query = query.filter(ServiceTicket.status == clean_status)

        total = query.count()
        total_pages = max(1, math.ceil(total / page_size))
        offset = (page - 1) * page_size
        raw_items = query.order_by(ServiceTicket.id.desc()).offset(offset).limit(page_size).all()
        formatted_items = [self.format_ticket_dict(t) for t in raw_items]

        return {
            "items": formatted_items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "stats": stats,
        }

    def barcode_lookup(self, code: str):
        from sqlalchemy import or_
        from app.models.inventory import SerializedItem, StockMovement
        from app.models.product import ProductVariant, Product
        from app.models.party import Customer

        clean_code = code.strip()
        # 1. Search in SerializedItem
        item = (
            self.db.query(SerializedItem)
            .filter(or_(SerializedItem.barcode == clean_code, SerializedItem.serial_number == clean_code))
            .first()
        )
        if item:
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            variant = self.db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first() if item.variant_id else None
            customer = self.db.query(Customer).filter(Customer.id == item.customer_id).first() if item.customer_id else None

            if not customer:
                mov = (
                    self.db.query(StockMovement)
                    .filter(StockMovement.item_id == item.id, StockMovement.customer_id.isnot(None))
                    .order_by(StockMovement.created_at.desc())
                    .first()
                )
                if mov and mov.customer_id:
                    customer = self.db.query(Customer).filter(Customer.id == mov.customer_id).first()

            return {
                "found": True,
                "barcode": clean_code,
                "product_id": item.product_id,
                "product_name": product.name if product else None,
                "variant_id": item.variant_id,
                "item_name": variant.name if (variant and variant.name) else (item.serial_number or None),
                "sku": variant.sku if variant else None,
                "customer_id": customer.id if customer else None,
                "customer_name": customer.name if customer else None,
                "customer_phone": customer.phone if customer else None,
                "customer_address": (customer.shipping_details or customer.billing_details) if customer else None,
            }

        # 2. Search in ProductVariant
        v = (
            self.db.query(ProductVariant)
            .filter(or_(ProductVariant.barcode == clean_code, ProductVariant.sku == clean_code))
            .first()
        )
        if v:
            product = self.db.query(Product).filter(Product.id == v.product_id).first()
            cust = (
                self.db.query(Customer)
                .join(SerializedItem, SerializedItem.customer_id == Customer.id)
                .filter(SerializedItem.variant_id == v.id)
                .first()
            )
            if not cust:
                mov = (
                    self.db.query(StockMovement)
                    .filter(StockMovement.variant_id == v.id, StockMovement.customer_id.isnot(None))
                    .order_by(StockMovement.created_at.desc())
                    .first()
                )
                if mov and mov.customer_id:
                    cust = self.db.query(Customer).filter(Customer.id == mov.customer_id).first()

            return {
                "found": True,
                "barcode": clean_code,
                "product_id": v.product_id,
                "product_name": product.name if product else None,
                "variant_id": v.id,
                "item_name": v.name or v.sku,
                "sku": v.sku,
                "customer_id": cust.id if cust else None,
                "customer_name": cust.name if cust else None,
                "customer_phone": cust.phone if cust else None,
                "customer_address": (cust.shipping_details or cust.billing_details) if cust else None,
            }

        return {
            "found": False,
            "barcode": clean_code,
            "product_id": None,
            "product_name": None,
            "variant_id": None,
            "item_name": None,
            "sku": None,
            "customer_id": None,
            "customer_name": None,
            "customer_phone": None,
            "customer_address": None,
        }
