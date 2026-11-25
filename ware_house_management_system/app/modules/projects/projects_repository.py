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
        from app.models.party import Customer
        import re

        project = self.get_project_by_id(project_id)
        if not project:
            return {
                "project_id": project_id,
                "project_name": "Unknown",
                "project_code": "—",
                "total_items": 0,
                "total_in_quantity": 0,
                "own_out_quantity": 0,
                "other_out_quantity": 0,
                "received_reallocated_quantity": 0,
                "total_out_quantity": 0,
                "net_quantity": 0,
                "product_summary": [],
                "items": [],
            }

        movements = (
            self.db.query(StockMovement)
            .filter(
                or_(
                    StockMovement.project_id == project_id,
                    StockMovement.allocated_project_id == project_id,
                )
            )
            .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
            .all()
        )

        items_list = []
        total_in_quantity = 0
        own_out_quantity = 0
        other_out_quantity = 0
        received_reallocated_quantity = 0
        total_out_quantity = 0
        recorded_serials_or_items = set()
        product_summary_map = {}

        def ensure_prod_entry(pid, prod_obj):
            if pid not in product_summary_map:
                t_type = (
                    prod_obj.tracking_type.value
                    if (prod_obj and hasattr(prod_obj.tracking_type, "value"))
                    else (str(prod_obj.tracking_type) if prod_obj else "bulk")
                )
                product_summary_map[pid] = {
                    "product_id": pid,
                    "product_name": prod_obj.name if prod_obj else f"Product #{pid}",
                    "product_code": prod_obj.product_code if prod_obj else "—",
                    "tracking_type": t_type,
                    "stock_in_qty": 0,
                    "own_out_qty": 0,
                    "other_out_qty": 0,
                    "total_out_qty": 0,
                    "remaining_qty": 0,
                    "other_destinations": set(),
                }
            return product_summary_map[pid]

        for m in movements:
            product = self.db.query(Product).filter(Product.id == m.product_id).first()
            variant = self.db.query(ProductVariant).filter(ProductVariant.id == m.variant_id).first() if m.variant_id else None
            user = self.db.query(User).filter(User.id == m.created_by).first() if m.created_by else None
            serialized_item = self.db.query(SerializedItem).filter(SerializedItem.id == m.product_item_id).first() if m.product_item_id else None
            alloc_proj = self.db.query(Project).filter(Project.id == m.allocated_project_id).first() if getattr(m, "allocated_project_id", None) else None
            dest_proj = self.db.query(Project).filter(Project.id == m.project_id).first() if (m.project_id and m.project_id != project_id) else None
            dest_cust = self.db.query(Customer).filter(Customer.id == m.customer_id).first() if m.customer_id else None

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

            m_alloc_pid = getattr(m, "allocated_project_id", None)
            out_scope = "in"

            if is_inbound:
                total_in_quantity += qty
                if m.product_id:
                    p_entry = ensure_prod_entry(m.product_id, product)
                    p_entry["stock_in_qty"] += qty
            else:
                if m.project_id == project_id and (m_alloc_pid is None or m_alloc_pid == project_id):
                    out_scope = "own"
                    own_out_quantity += qty
                    total_out_quantity += qty
                    if m.product_id:
                        p_entry = ensure_prod_entry(m.product_id, product)
                        p_entry["own_out_qty"] += qty
                        p_entry["total_out_qty"] += qty
                elif m_alloc_pid == project_id and m.project_id != project_id:
                    out_scope = "other"
                    other_out_quantity += qty
                    total_out_quantity += qty
                    if m.product_id:
                        p_entry = ensure_prod_entry(m.product_id, product)
                        p_entry["other_out_qty"] += qty
                        p_entry["total_out_qty"] += qty
                        if dest_proj:
                            p_entry["other_destinations"].add(f"{dest_proj.name} ({dest_proj.code})" if dest_proj.code else dest_proj.name)
                        elif dest_cust:
                            p_entry["other_destinations"].add(f"Customer: {dest_cust.name}")
                        else:
                            p_entry["other_destinations"].add("Other Destination")
                else:
                    # m.project_id == project_id and m_alloc_pid is a DIFFERENT project (received via reallocation)
                    out_scope = "received_from_other"
                    received_reallocated_quantity += qty

            items_list.append({
                "id": m.id,
                "movement_id": m.id,
                "direction": direction,
                "out_scope": out_scope,
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
                "allocated_project_id": m_alloc_pid,
                "allocated_project_name": alloc_proj.name if alloc_proj else None,
                "allocated_project_code": alloc_proj.code if alloc_proj else None,
                "destination_project_id": m.project_id,
                "destination_project_name": dest_proj.name if dest_proj else (project.name if m.project_id == project_id else None),
                "destination_project_code": dest_proj.code if dest_proj else (project.code if m.project_id == project_id else None),
                "destination_customer_name": dest_cust.name if dest_cust else None,
                "is_cross_project": bool(getattr(m, "is_cross_project", False)) or out_scope == "other",
            })

        direct_serials = (
            self.db.query(SerializedItem)
            .filter(
                or_(
                    SerializedItem.project_id == project_id,
                    SerializedItem.allocated_project_id == project_id,
                )
            )
            .all()
        )
        for s in direct_serials:
            if s.id not in recorded_serials_or_items:
                product = self.db.query(Product).filter(Product.id == s.product_id).first()
                variant = self.db.query(ProductVariant).filter(ProductVariant.id == s.variant_id).first() if s.variant_id else None
                wh = self.db.query(Warehouse).filter(Warehouse.id == s.warehouse_id).first() if s.warehouse_id else None
                alloc_p = self.db.query(Project).filter(Project.id == s.allocated_project_id).first() if getattr(s, "allocated_project_id", None) else None
                total_in_quantity += 1
                if s.product_id:
                    p_entry = ensure_prod_entry(s.product_id, product)
                    p_entry["stock_in_qty"] += 1
                items_list.append({
                    "id": f"si-{s.id}",
                    "movement_id": None,
                    "direction": "in",
                    "out_scope": "in",
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
                    "allocated_project_id": getattr(s, "allocated_project_id", None),
                    "allocated_project_name": alloc_p.name if alloc_p else None,
                    "allocated_project_code": alloc_p.code if alloc_p else None,
                    "destination_project_id": None,
                    "destination_project_name": None,
                    "destination_project_code": None,
                    "destination_customer_name": None,
                    "is_cross_project": False,
                })

        product_summary_list = []
        for p_entry in product_summary_map.values():
            p_entry["remaining_qty"] = p_entry["stock_in_qty"] - p_entry["total_out_qty"]
            p_entry["other_destinations"] = sorted(list(p_entry["other_destinations"]))
            product_summary_list.append(p_entry)
        product_summary_list.sort(key=lambda x: x["stock_in_qty"], reverse=True)

        return {
            "project_id": project.id,
            "project_name": project.name,
            "project_code": project.code,
            "total_items": len(items_list),
            "total_in_quantity": total_in_quantity,
            "own_out_quantity": own_out_quantity,
            "other_out_quantity": other_out_quantity,
            "received_reallocated_quantity": received_reallocated_quantity,
            "total_out_quantity": total_out_quantity,
            "net_quantity": total_in_quantity - total_out_quantity,
            "product_summary": product_summary_list,
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
                    "total_own_out": 0,
                    "total_other_out": 0,
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

        # All projects for dropdown selection & destination lookup
        all_projs_query = self.db.query(Project).order_by(Project.name.asc()).all()
        all_proj_map = {p.id: p for p in all_projs_query}
        projects_list = [
            {"id": p.id, "name": p.name, "code": p.code, "status": p.status}
            for p in all_projs_query
        ]

        # 3. Query all Products & Customers for destination names
        from app.models.party import Customer
        all_products = self.db.query(Product).all()
        prod_map = {pr.id: pr for pr in all_products}
        all_customers = self.db.query(Customer).all()
        cust_map = {c.id: c for c in all_customers}

        # 4. Query movements associated with these projects (either directly or via allocated_project_id)
        sm_query = self.db.query(StockMovement).filter(
            or_(
                StockMovement.project_id.in_(project_ids),
                StockMovement.allocated_project_id.in_(project_ids),
            )
        )
        if warehouse_id:
            sm_query = sm_query.filter(
                or_(
                    StockMovement.from_warehouse_id == warehouse_id,
                    StockMovement.to_warehouse_id == warehouse_id,
                )
            )
        movements = sm_query.order_by(StockMovement.created_at.asc()).all()

        si_query = self.db.query(SerializedItem).filter(
            or_(
                SerializedItem.project_id.in_(project_ids),
                SerializedItem.allocated_project_id.in_(project_ids),
            )
        )
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
                "own_out_qty": 0,
                "other_out_qty": 0,
                "stock_out_qty": 0,
                "remaining_stock": 0,
                "other_destinations": set(),
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
                    "period_own_out": 0,
                    "period_other_out": 0,
                    "period_out": 0,
                    "all_time_in": 0,
                    "all_time_out": 0,
                    "other_destinations": set(),
                    "last_movement_at": None,
                }
            return pair_data[key]

        movement_serial_ids = set()
        for m in movements:
            if not m.product_id:
                continue

            if m.product_item_id:
                movement_serial_ids.add(m.product_item_id)

            qty = m.quantity or 1
            m_dt = m.created_at
            m_alloc_pid = getattr(m, "allocated_project_id", None)

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
                owner_pid = m.project_id if m.project_id in proj_map else (m_alloc_pid if m_alloc_pid in proj_map else None)
                if not owner_pid:
                    continue
                rec = get_pair(owner_pid, m.product_id)
                if m_dt and (rec["last_movement_at"] is None or m_dt > rec["last_movement_at"]):
                    rec["last_movement_at"] = m_dt
                rec["all_time_in"] += qty
                if has_date_filter:
                    if dt_from and m_dt and m_dt < dt_from:
                        rec["opening_in"] += qty
                    elif (not dt_from or (m_dt and m_dt >= dt_from)) and (not dt_to or (m_dt and m_dt < dt_to)):
                        rec["period_in"] += qty
                else:
                    rec["period_in"] += qty
            else:
                # Outbound movement: classify as Own Out vs Other Project Out
                if m.project_id in proj_map and (m_alloc_pid is None or m_alloc_pid == m.project_id):
                    rec = get_pair(m.project_id, m.product_id)
                    if m_dt and (rec["last_movement_at"] is None or m_dt > rec["last_movement_at"]):
                        rec["last_movement_at"] = m_dt
                    rec["all_time_out"] += qty
                    if has_date_filter:
                        if dt_from and m_dt and m_dt < dt_from:
                            rec["opening_out"] += qty
                        elif (not dt_from or (m_dt and m_dt >= dt_from)) and (not dt_to or (m_dt and m_dt < dt_to)):
                            rec["period_own_out"] += qty
                            rec["period_out"] += qty
                    else:
                        rec["period_own_out"] += qty
                        rec["period_out"] += qty
                elif m_alloc_pid in proj_map and m.project_id != m_alloc_pid:
                    rec = get_pair(m_alloc_pid, m.product_id)
                    if m_dt and (rec["last_movement_at"] is None or m_dt > rec["last_movement_at"]):
                        rec["last_movement_at"] = m_dt
                    rec["all_time_out"] += qty
                    if has_date_filter:
                        if dt_from and m_dt and m_dt < dt_from:
                            rec["opening_out"] += qty
                        elif (not dt_from or (m_dt and m_dt >= dt_from)) and (not dt_to or (m_dt and m_dt < dt_to)):
                            rec["period_other_out"] += qty
                            rec["period_out"] += qty
                    else:
                        rec["period_other_out"] += qty
                        rec["period_out"] += qty

                    # Record destination label
                    if m.project_id and m.project_id in all_proj_map:
                        dp = all_proj_map[m.project_id]
                        rec["other_destinations"].add(f"{dp.name} ({dp.code})" if dp.code else dp.name)
                    elif m.customer_id and m.customer_id in cust_map:
                        rec["other_destinations"].add(f"Customer: {cust_map[m.customer_id].name}")
                    else:
                        rec["other_destinations"].add("Other Destination")

        for s in direct_serials:
            s_pid = s.project_id if s.project_id in proj_map else (getattr(s, "allocated_project_id", None) if getattr(s, "allocated_project_id", None) in proj_map else None)
            if s.id in movement_serial_ids or not s.product_id or not s_pid:
                continue
            rec = get_pair(s_pid, s.product_id)
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
        tot_own_out = 0
        tot_other_out = 0
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
            own_out_qty = rec["period_own_out"]
            other_out_qty = rec["period_other_out"]
            stock_out_qty = rec["period_out"]
            remaining_stock = opening_stock + stock_in_qty - stock_out_qty
            other_dests = sorted(list(rec["other_destinations"]))

            tot_opening += opening_stock
            tot_in += stock_in_qty
            tot_own_out += own_out_qty
            tot_other_out += other_out_qty
            tot_out += stock_out_qty
            tot_remaining += remaining_stock

            distinct_products_all.add(prid)
            distinct_projects_all.add(pid)

            if pid in project_stats:
                ps = project_stats[pid]
                ps["opening_stock"] += opening_stock
                ps["stock_in_qty"] += stock_in_qty
                ps["own_out_qty"] += own_out_qty
                ps["other_out_qty"] += other_out_qty
                ps["stock_out_qty"] += stock_out_qty
                ps["remaining_stock"] += remaining_stock
                for od in other_dests:
                    ps["other_destinations"].add(od)
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
                "own_out_qty": own_out_qty,
                "other_out_qty": other_out_qty,
                "stock_out_qty": stock_out_qty,
                "other_destinations": other_dests,
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
                "own_out_qty": ps["own_out_qty"],
                "other_out_qty": ps["other_out_qty"],
                "stock_out_qty": ps["stock_out_qty"],
                "other_destinations": sorted(list(ps["other_destinations"])),
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
                "total_own_out": tot_own_out,
                "total_other_out": tot_other_out,
                "total_stock_out": tot_out,
                "total_remaining_stock": tot_remaining,
                "has_date_filter": has_date_filter,
            },
            "items": items_report,
            "projects_summary": projects_summary_list,
            "projects_list": projects_list,
        }
