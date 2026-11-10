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
        project_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        search: Optional[str] = None,
        tracking_type: Optional[str] = None,
    ) -> dict:
        from datetime import datetime, time, timedelta
        from app.models.inventory import StockMovement, SerializedItem
        from app.models.product import Product

        # 1. Parse string dates safely
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

        # 2. Query all matching projects
        p_query = self.db.query(Project)
        if status and status != "all":
            p_query = p_query.filter(Project.status == status)

        clean_pid = None
        if project_id and str(project_id).strip() not in ("all", "", "None"):
            try:
                clean_pid = int(str(project_id).strip())
                p_query = p_query.filter(Project.id == clean_pid)
            except Exception:
                clean_pid = None

        projects = p_query.order_by(Project.name.asc()).all()
        if not projects:
            return {
                "summary": {
                    "total_products": 0,
                    "total_projects": 0,
                    "active_projects": 0,
                    "total_opening_stock": 0,
                    "total_stock_in": 0,
                    "total_stock_out": 0,
                    "total_remaining_stock": 0,
                    "has_date_filter": has_date_filter,
                },
                "items": [],
                "projects_summary": [],
                "projects_list": [],
            }

        proj_map = {p.id: p for p in projects}
        project_ids = list(proj_map.keys())

        # All projects for dropdown selection
        all_projs_query = self.db.query(Project).order_by(Project.name.asc()).all()
        projects_list = [
            {"id": p.id, "name": p.name, "code": p.code, "status": p.status}
            for p in all_projs_query
        ]

        # 3. Query all Products
        all_products = self.db.query(Product).all()
        prod_map = {pr.id: pr for pr in all_products}

        # 4. Query movements associated with these projects
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

        pair_data = {}
        project_stats = {
            pid: {
                "project_id": pid,
                "project_name": proj_map[pid].name,
                "project_code": proj_map[pid].code,
                "location": proj_map[pid].location,
                "status": proj_map[pid].status,
                "opening_stock": 0,
                "stock_in_qty": 0,
                "stock_out_qty": 0,
                "remaining_stock": 0,
                "distinct_products": set(),
            }
            for pid in project_ids
        }

        def get_pair(pid, prid):
            key = (pid, prid)
            if key not in pair_data:
                pair_data[key] = {
                    "project_id": pid,
                    "product_id": prid,
                    "opening_in": 0,
                    "opening_out": 0,
                    "period_in": 0,
                    "period_out": 0,
                    "all_time_in": 0,
                    "all_time_out": 0,
                    "last_movement_at": None,
                }
            return pair_data[key]

        movement_serial_ids = set()
        for m in movements:
            if not m.product_id or m.project_id not in proj_map:
                continue

            if m.product_item_id:
                movement_serial_ids.add(m.product_item_id)

            rec = get_pair(m.project_id, m.product_id)
            qty = m.quantity or 1
            m_dt = m.created_at

            if m_dt:
                if rec["last_movement_at"] is None or m_dt > rec["last_movement_at"]:
                    rec["last_movement_at"] = m_dt

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
                rec["all_time_in"] += qty
                if has_date_filter:
                    if dt_from and m_dt and m_dt < dt_from:
                        rec["opening_in"] += qty
                    elif (not dt_from or (m_dt and m_dt >= dt_from)) and (not dt_to or (m_dt and m_dt < dt_to)):
                        rec["period_in"] += qty
                else:
                    rec["period_in"] += qty
            else:
                rec["all_time_out"] += qty
                if has_date_filter:
                    if dt_from and m_dt and m_dt < dt_from:
                        rec["opening_out"] += qty
                    elif (not dt_from or (m_dt and m_dt >= dt_from)) and (not dt_to or (m_dt and m_dt < dt_to)):
                        rec["period_out"] += qty
                else:
                    rec["period_out"] += qty

        for s in direct_serials:
            if s.id in movement_serial_ids or not s.product_id or s.project_id not in proj_map:
                continue
            rec = get_pair(s.project_id, s.product_id)
            s_dt = s.created_at
            if s_dt:
                if rec["last_movement_at"] is None or s_dt > rec["last_movement_at"]:
                    rec["last_movement_at"] = s_dt

            rec["all_time_in"] += 1
            if has_date_filter:
                if dt_from and s_dt and s_dt < dt_from:
                    rec["opening_in"] += 1
                elif (not dt_from or (s_dt and s_dt >= dt_from)) and (not dt_to or (s_dt and s_dt < dt_to)):
                    rec["period_in"] += 1
            else:
                rec["period_in"] += 1

        # Build items list
        items_report = []
        tot_opening = 0
        tot_in = 0
        tot_out = 0
        tot_remaining = 0
        distinct_products_all = set()
        distinct_projects_all = set()

        search_clean = search.strip().lower() if (search and search.strip()) else None
        target_tracking = tracking_type.lower() if (tracking_type and tracking_type.lower() != "all") else None

        for (pid, prid), rec in pair_data.items():
            p = proj_map.get(pid)
            prod = prod_map.get(prid)
            if not p or not prod:
                continue

            prod_tracking = (
                prod.tracking_type.value
                if hasattr(prod.tracking_type, "value")
                else str(prod.tracking_type)
            ).lower()

            if target_tracking and prod_tracking != target_tracking:
                continue

            cat_name = prod.category.name if prod.category else "General"

            # Search filtering across product and project
            if search_clean:
                matches = (
                    search_clean in prod.name.lower()
                    or (prod.product_code and search_clean in prod.product_code.lower())
                    or search_clean in cat_name.lower()
                    or search_clean in p.name.lower()
                    or (p.code and search_clean in p.code.lower())
                    or (p.location and search_clean in p.location.lower())
                )
                if not matches:
                    continue

            opening_stock = rec["opening_in"] - rec["opening_out"]
            stock_in_qty = rec["period_in"]
            stock_out_qty = rec["period_out"]
            remaining_stock = opening_stock + stock_in_qty - stock_out_qty

            tot_opening += opening_stock
            tot_in += stock_in_qty
            tot_out += stock_out_qty
            tot_remaining += remaining_stock

            distinct_products_all.add(prid)
            distinct_projects_all.add(pid)

            if pid in project_stats:
                ps = project_stats[pid]
                ps["opening_stock"] += opening_stock
                ps["stock_in_qty"] += stock_in_qty
                ps["stock_out_qty"] += stock_out_qty
                ps["remaining_stock"] += remaining_stock
                ps["distinct_products"].add(prid)

            items_report.append({
                "id": f"{pid}-{prid}",
                "project_id": p.id,
                "project_name": p.name,
                "project_code": p.code or "—",
                "site_location": p.location or "—",
                "project_status": p.status,
                "product_id": prod.id,
                "product_name": prod.name,
                "product_code": prod.product_code or "—",
                "category_name": cat_name,
                "tracking_type": prod_tracking,
                "opening_stock": opening_stock,
                "stock_in_qty": stock_in_qty,
                "stock_out_qty": stock_out_qty,
                "closing_stock": remaining_stock,
                "remaining_stock": remaining_stock,
                "all_time_in": rec["all_time_in"],
                "all_time_out": rec["all_time_out"],
                "last_movement_at": rec["last_movement_at"].isoformat() if rec["last_movement_at"] else None,
            })

        items_report.sort(
            key=lambda x: (x["project_name"], x["product_name"])
        )

        projects_summary_list = []
        for pid, ps in project_stats.items():
            projects_summary_list.append({
                "project_id": ps["project_id"],
                "project_name": ps["project_name"],
                "project_code": ps["project_code"],
                "site_location": ps["location"],
                "status": ps["status"],
                "distinct_products_count": len(ps["distinct_products"]),
                "opening_stock": ps["opening_stock"],
                "stock_in_qty": ps["stock_in_qty"],
                "stock_out_qty": ps["stock_out_qty"],
                "remaining_stock": ps["remaining_stock"],
            })

        active_projects_count = sum(1 for p in projects if p.status == "active")

        return {
            "summary": {
                "total_products": len(distinct_products_all),
                "total_projects": len(distinct_projects_all) if clean_pid is None else 1,
                "active_projects": active_projects_count,
                "total_opening_stock": tot_opening,
                "total_stock_in": tot_in,
                "total_stock_out": tot_out,
                "total_remaining_stock": tot_remaining,
                "has_date_filter": has_date_filter,
            },
            "items": items_report,
            "projects_summary": projects_summary_list,
            "projects_list": projects_list,
        }
