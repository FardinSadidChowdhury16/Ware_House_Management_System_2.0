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
