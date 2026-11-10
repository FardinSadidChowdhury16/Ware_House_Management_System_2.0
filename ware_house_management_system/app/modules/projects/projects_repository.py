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
            return {"items": [], "total_items": 0, "total_quantity": 0}

        movements = (
            self.db.query(StockMovement)
            .filter(StockMovement.project_id == project_id)
            .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
            .all()
        )

        items_list = []
        total_quantity = 0
        recorded_serials_or_items = set()

        for m in movements:
            product = self.db.query(Product).filter(Product.id == m.product_id).first()
            variant = self.db.query(ProductVariant).filter(ProductVariant.id == m.variant_id).first() if m.variant_id else None
            wh = self.db.query(Warehouse).filter(Warehouse.id == m.from_warehouse_id).first() if m.from_warehouse_id else None
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
            total_quantity += qty

            items_list.append({
                "id": m.id,
                "movement_id": m.id,
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
                "source_warehouse_id": m.from_warehouse_id,
                "source_warehouse_name": wh.name if wh else (f"WH #{m.from_warehouse_id}" if m.from_warehouse_id else "—"),
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
                total_quantity += 1
                items_list.append({
                    "id": f"si-{s.id}",
                    "movement_id": None,
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
                    "dispatched_by_name": "Direct Assignment",
                    "dispatched_at": s.created_at,
                })

        return {
            "project_id": project.id,
            "project_name": project.name,
            "project_code": project.code,
            "total_items": len(items_list),
            "total_quantity": total_quantity,
            "items": items_list,
        }
