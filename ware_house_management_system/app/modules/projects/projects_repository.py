from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_projects(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[Project], int]:
        query = self.db.query(Project)

        if search and search.strip():
            pat = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Project.name.ilike(pat),
                    Project.code.ilike(pat),
                    Project.location.ilike(pat),
                    Project.contact_info.ilike(pat),
                    Project.description.ilike(pat),
                )
            )

        if status and status != "all":
            query = query.filter(Project.status == status)

        total = query.count()
        items = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_project_by_id(self, project_id: int) -> Optional[Project]:
        return self.db.query(Project).filter(Project.id == project_id).first()

    def get_project_by_code(self, code: str) -> Optional[Project]:
        return self.db.query(Project).filter(Project.code == code.strip()).first()

    def create_project(self, project_in: ProjectCreate) -> Project:
        project = Project(
            name=project_in.name.strip(),
            code=project_in.code.strip().upper(),
            location=project_in.location.strip(),
            contact_info=project_in.contact_info.strip(),
            description=project_in.description.strip() if project_in.description else None,
            status=project_in.status or "active",
            is_active=True,
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update_project(self, project_id: int, project_in: ProjectUpdate) -> Optional[Project]:
        project = self.get_project_by_id(project_id)
        if not project:
            return None

        update_data = project_in.model_dump(exclude_unset=True)
        if "name" in update_data and update_data["name"]:
            update_data["name"] = update_data["name"].strip()
        if "code" in update_data and update_data["code"]:
            update_data["code"] = update_data["code"].strip().upper()
        if "location" in update_data and update_data["location"]:
            update_data["location"] = update_data["location"].strip()
        if "contact_info" in update_data and update_data["contact_info"]:
            update_data["contact_info"] = update_data["contact_info"].strip()

        for field, value in update_data.items():
            setattr(project, field, value)

        self.db.commit()
        self.db.refresh(project)
        return project

    def delete_project(self, project_id: int) -> bool:
        project = self.get_project_by_id(project_id)
        if not project:
            return False
        self.db.delete(project)
        self.db.commit()
        return True

    def toggle_status(self, project_id: int) -> Optional[Project]:
        project = self.get_project_by_id(project_id)
        if not project:
            return None
        project.is_active = not project.is_active
        if not project.is_active:
            project.status = "on_hold"
        else:
            project.status = "active"
        self.db.commit()
        self.db.refresh(project)
        return project

    def get_stats(self) -> dict:
        total = self.db.query(Project).count()
        active = self.db.query(Project).filter(Project.status == "active").count()
        completed = self.db.query(Project).filter(Project.status == "completed").count()
        on_hold = self.db.query(Project).filter(Project.status == "on_hold").count()
        return {
            "total_projects": total,
            "active_projects": active,
            "completed_projects": completed,
            "on_hold_projects": on_hold,
        }

    def get_assigned_items(self, project_id: int) -> dict:
        from app.models.inventory import StockMovement, SerializedItem
        from app.models.product import Product, ProductVariant
        from app.models.warehouse import Warehouse
        from app.models.access_control import User
        import re

        project = self.get_project_by_id(project_id)
        if not project:
            return {
                "project_id": project_id,
                "project_name": "Unknown",
                "project_code": "—",
                "total_items": 0,
                "total_in_quantity": 0,
                "total_out_quantity": 0,
                "net_quantity": 0,
                "items": [],
            }

        movements = (
            self.db.query(StockMovement)
            .filter(StockMovement.project_id == project_id)
            .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
            .all()
        )

        items_list = []
        total_in_quantity = 0
        total_out_quantity = 0
        recorded_serials_or_items = set()

        for m in movements:
            product = self.db.query(Product).filter(Product.id == m.product_id).first()
            variant = self.db.query(ProductVariant).filter(ProductVariant.id == m.variant_id).first() if m.variant_id else None
            user = self.db.query(User).filter(User.id == m.created_by).first() if m.created_by else None
            serialized_item = self.db.query(SerializedItem).filter(SerializedItem.id == m.product_item_id).first() if m.product_item_id else None

            if serialized_item:
                recorded_serials_or_items.add(serialized_item.id)

            serial_no = serialized_item.serial_number if serialized_item else None
            barcode_val = (
                (serialized_item.barcode if serialized_item else None)
                or (variant.barcode if variant else None)
                or (product.barcode if product else None)
            )

            ref_no = None
            if m.reference_id:
                ref_no = str(m.reference_id)
            elif m.note and "Ref:" in m.note:
                m_match = re.search(r"Ref:\s*([^|]+)", m.note, re.IGNORECASE)
                if m_match:
                    ref_no = m_match.group(1).strip()

            qty = m.quantity or 1

            mov_type_str = (
                m.movement_type.value
                if hasattr(m.movement_type, "value")
                else str(m.movement_type)
            ).lower()

            is_inbound = (
                m.to_warehouse_id is not None
                or "in" in mov_type_str
                or mov_type_str == "purchase_in"
            ) and not (m.from_warehouse_id is not None and "out" in mov_type_str)

            direction = "in" if is_inbound else "out"
            target_wh_id = m.to_warehouse_id if is_inbound else m.from_warehouse_id
            wh = self.db.query(Warehouse).filter(Warehouse.id == target_wh_id).first() if target_wh_id else None

            if is_inbound:
                total_in_quantity += qty
            else:
                total_out_quantity += qty

            items_list.append({
                "id": m.id,
                "movement_id": m.id,
                "direction": direction,
                "movement_type": mov_type_str,
                "product_id": m.product_id,
                "product_name": product.name if product else f"Product #{m.product_id}",
                "product_code": product.product_code if product else "—",
                "variant_id": m.variant_id,
                "variant_name": variant.name if variant else None,
                "variant_sku": variant.sku if variant else None,
                "tracking_type": product.tracking_type.value if (product and hasattr(product.tracking_type, "value")) else (str(product.tracking_type) if product else "bulk"),
                "serial_number": serial_no,
                "barcode": barcode_val,
                "quantity": qty,
                "source_warehouse_id": target_wh_id,
                "source_warehouse_name": wh.name if wh else (f"WH #{target_wh_id}" if target_wh_id else "—"),
                "reference_number": ref_no,
                "note": m.note,
                "attachment_url": m.attachment_url,
                "dispatched_by_id": m.created_by,
                "dispatched_by_name": user.name if user else None,
                "dispatched_at": m.created_at,
            })

        direct_serials = (
            self.db.query(SerializedItem)
            .filter(SerializedItem.project_id == project_id)
            .all()
        )
        for s in direct_serials:
            if s.id not in recorded_serials_or_items:
                product = self.db.query(Product).filter(Product.id == s.product_id).first()
                variant = self.db.query(ProductVariant).filter(ProductVariant.id == s.variant_id).first() if s.variant_id else None
                wh = self.db.query(Warehouse).filter(Warehouse.id == s.warehouse_id).first() if s.warehouse_id else None
                total_in_quantity += 1
                items_list.append({
                    "id": f"si-{s.id}",
                    "movement_id": None,
                    "direction": "in",
                    "movement_type": "direct_allocation",
                    "product_id": s.product_id,
                    "product_name": product.name if product else f"Product #{s.product_id}",
                    "product_code": product.product_code if product else "—",
                    "variant_id": s.variant_id,
                    "variant_name": variant.name if variant else None,
                    "variant_sku": variant.sku if variant else None,
                    "tracking_type": "serialized",
                    "serial_number": s.serial_number,
                    "barcode": s.barcode,
                    "quantity": 1,
                    "source_warehouse_id": s.warehouse_id,
                    "source_warehouse_name": wh.name if wh else "—",
                    "reference_number": "—",
                    "note": f"Status: {s.status.value if hasattr(s.status, 'value') else s.status}",
                    "attachment_url": None,
                    "dispatched_by_id": None,
                    "dispatched_by_name": "Direct Allocation",
                    "dispatched_at": s.created_at,
                })

        return {
            "project_id": project.id,
            "project_name": project.name,
            "project_code": project.code,
            "total_items": len(items_list),
            "total_in_quantity": total_in_quantity,
            "total_out_quantity": total_out_quantity,
            "net_quantity": total_in_quantity - total_out_quantity,
            "items": items_list,
        }

    def get_project_summary_report(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> dict:
        from datetime import datetime, time, timedelta
        from app.models.inventory import StockMovement, SerializedItem

        d_from = None
        if date_from and str(date_from).strip():
            clean_from = str(date_from).strip().split("T")[0]
            try:
                d_from = datetime.strptime(clean_from, "%Y-%m-%d").date()
            except Exception:
                try:
                    d_from = datetime.fromisoformat(str(date_from).strip()).date()
                except Exception:
                    d_from = None

        d_to = None
        if date_to and str(date_to).strip():
            clean_to = str(date_to).strip().split("T")[0]
            try:
                d_to = datetime.strptime(clean_to, "%Y-%m-%d").date()
            except Exception:
                try:
                    d_to = datetime.fromisoformat(str(date_to).strip()).date()
                except Exception:
                    d_to = None

        dt_from = None
        if d_from:
            dt_from = datetime.combine(d_from, time.min) - timedelta(hours=6)

        dt_to = None
        if d_to:
            dt_to = datetime.combine(d_to + timedelta(days=1), time.min) + timedelta(hours=6)

        has_date_filter = bool(dt_from or dt_to)

        p_query = self.db.query(Project)
        if search and search.strip():
            pat = f"%{search.strip()}%"
            p_query = p_query.filter(
                or_(
                    Project.name.ilike(pat),
                    Project.code.ilike(pat),
                    Project.location.ilike(pat),
                    Project.contact_info.ilike(pat),
                )
            )
        if status and status != "all":
            p_query = p_query.filter(Project.status == status)

        projects = p_query.order_by(Project.created_at.desc(), Project.id.desc()).all()
        if not projects:
            return {
                "summary": {
                    "total_projects": 0,
                    "active_projects": 0,
                    "completed_projects": 0,
                    "on_hold_projects": 0,
                    "total_opening_balance": 0,
                    "total_period_in": 0,
                    "total_period_out": 0,
                    "total_period_balance": 0,
                    "total_closing_in": 0,
                    "total_closing_out": 0,
                    "total_closing_balance": 0,
                    "total_shipments_in": 0,
                    "total_shipments_out": 0,
                },
                "items": [],
            }

        project_ids = [p.id for p in projects]

        sm_query = self.db.query(StockMovement).filter(StockMovement.project_id.in_(project_ids))
        if warehouse_id:
            sm_query = sm_query.filter(
                or_(
                    StockMovement.from_warehouse_id == warehouse_id,
                    StockMovement.to_warehouse_id == warehouse_id,
                )
            )
        movements = sm_query.order_by(StockMovement.created_at.asc()).all()

        si_query = self.db.query(SerializedItem).filter(SerializedItem.project_id.in_(project_ids))
        if warehouse_id:
            si_query = si_query.filter(SerializedItem.warehouse_id == warehouse_id)
        direct_serials = si_query.all()

        movements_by_proj = {pid: [] for pid in project_ids}
        movement_serial_ids = set()
        for m in movements:
            movements_by_proj[m.project_id].append(m)
            if m.product_item_id:
                movement_serial_ids.add(m.product_item_id)

        serials_by_proj = {pid: [] for pid in project_ids}
        for s in direct_serials:
            if s.id not in movement_serial_ids:
                serials_by_proj[s.project_id].append(s)

        items_report = []
        tot_opening_bal = 0
        tot_period_in = 0
        tot_period_out = 0
        tot_closing_in = 0
        tot_closing_out = 0
        tot_closing_bal = 0
        tot_shipments_in = 0
        tot_shipments_out = 0

        active_count = 0
        completed_count = 0
        on_hold_count = 0

        for p in projects:
            if p.status == "active":
                active_count += 1
            elif p.status == "completed":
                completed_count += 1
            elif p.status == "on_hold":
                on_hold_count += 1

            p_movs = movements_by_proj.get(p.id, [])
            p_serials = serials_by_proj.get(p.id, [])

            opening_in = 0
            opening_out = 0
            period_in = 0
            period_out = 0
            period_in_shipments = 0
            period_out_shipments = 0
            distinct_products = set()
            last_inbound = None
            last_outbound = None
            last_activity = None

            for m in p_movs:
                qty = m.quantity or 1
                distinct_products.add(m.product_id)
                m_dt = m.created_at
                if m_dt:
                    if last_activity is None or m_dt > last_activity:
                        last_activity = m_dt

                mov_type_str = (
                    m.movement_type.value
                    if hasattr(m.movement_type, "value")
                    else str(m.movement_type)
                ).lower()

                is_inbound = (
                    m.to_warehouse_id is not None
                    or "in" in mov_type_str
                    or mov_type_str == "purchase_in"
                ) and not (m.from_warehouse_id is not None and "out" in mov_type_str)

                if is_inbound:
                    if m_dt and (last_inbound is None or m_dt > last_inbound):
                        last_inbound = m_dt
                else:
                    if m_dt and (last_outbound is None or m_dt > last_outbound):
                        last_outbound = m_dt

                if has_date_filter:
                    if dt_from and m_dt and m_dt < dt_from:
                        if is_inbound:
                            opening_in += qty
                        else:
                            opening_out += qty
                    elif (not dt_from or (m_dt and m_dt >= dt_from)) and (not dt_to or (m_dt and m_dt < dt_to)):
                        if is_inbound:
                            period_in += qty
                            period_in_shipments += 1
                        else:
                            period_out += qty
                            period_out_shipments += 1
                else:
                    if is_inbound:
                        period_in += qty
                        period_in_shipments += 1
                    else:
                        period_out += qty
                        period_out_shipments += 1

            for s in p_serials:
                distinct_products.add(s.product_id)
                s_dt = s.created_at
                if s_dt:
                    if last_activity is None or s_dt > last_activity:
                        last_activity = s_dt
                    if last_inbound is None or s_dt > last_inbound:
                        last_inbound = s_dt

                if has_date_filter:
                    if dt_from and s_dt and s_dt < dt_from:
                        opening_in += 1
                    elif (not dt_from or (s_dt and s_dt >= dt_from)) and (not dt_to or (s_dt and s_dt < dt_to)):
                        period_in += 1
                        period_in_shipments += 1
                else:
                    period_in += 1
                    period_in_shipments += 1

            opening_balance = opening_in - opening_out
            period_balance = period_in - period_out
            closing_in = opening_in + period_in
            closing_out = opening_out + period_out
            closing_balance = closing_in - closing_out

            all_time_in = (
                sum((m.quantity or 1) for m in p_movs if (
                    m.to_warehouse_id is not None
                    or "in" in (m.movement_type.value if hasattr(m.movement_type, "value") else str(m.movement_type)).lower()
                ))
                + len(p_serials)
            )
            all_time_out = sum(
                (m.quantity or 1)
                for m in p_movs
                if not (
                    m.to_warehouse_id is not None
                    or "in" in (m.movement_type.value if hasattr(m.movement_type, "value") else str(m.movement_type)).lower()
                )
            )

            tot_opening_bal += opening_balance
            tot_period_in += period_in
            tot_period_out += period_out
            tot_closing_in += closing_in
            tot_closing_out += closing_out
            tot_closing_bal += closing_balance
            tot_shipments_in += period_in_shipments
            tot_shipments_out += period_out_shipments

            items_report.append({
                "project_id": p.id,
                "project_name": p.name,
                "project_code": p.code,
                "location": p.location,
                "contact_info": p.contact_info,
                "description": p.description,
                "status": p.status,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "opening_in": opening_in,
                "opening_out": opening_out,
                "opening_balance": opening_balance,
                "period_in": period_in,
                "period_out": period_out,
                "period_balance": period_balance,
                "closing_in": closing_in,
                "closing_out": closing_out,
                "closing_balance": closing_balance,
                "all_time_in": all_time_in,
                "all_time_out": all_time_out,
                "all_time_balance": all_time_in - all_time_out,
                "distinct_products_count": len(distinct_products),
                "shipments_in_count": period_in_shipments,
                "shipments_out_count": period_out_shipments,
                "last_activity_at": last_activity.isoformat() if last_activity else None,
                "last_inbound_at": last_inbound.isoformat() if last_inbound else None,
                "last_outbound_at": last_outbound.isoformat() if last_outbound else None,
            })

        return {
            "summary": {
                "total_projects": len(projects),
                "active_projects": active_count,
                "completed_projects": completed_count,
                "on_hold_projects": on_hold_count,
                "total_opening_balance": tot_opening_bal,
                "total_period_in": tot_period_in,
                "total_period_out": tot_period_out,
                "total_period_balance": tot_period_in - tot_period_out,
                "total_closing_in": tot_closing_in,
                "total_closing_out": tot_closing_out,
                "total_closing_balance": tot_closing_bal,
                "total_shipments_in": tot_shipments_in,
                "total_shipments_out": tot_shipments_out,
            },
            "items": items_report,
        }
