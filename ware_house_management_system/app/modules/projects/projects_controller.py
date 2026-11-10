from typing import Optional, List
from sqlalchemy.orm import Session

from app.modules.projects.projects_service import ProjectService
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse


class ProjectController:
    def __init__(self, db: Session):
        self.service = ProjectService(db)

    def get_projects(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ):
        items, total = self.service.get_projects(skip=skip, limit=limit, search=search, status=status)
        return {
            "items": [ProjectResponse.model_validate(p) for p in items],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    def get_project(self, project_id: int):
        return self.service.get_project_by_id(project_id)

    def create_project(self, project_in: ProjectCreate):
        return self.service.create_project(project_in)

    def update_project(self, project_id: int, project_in: ProjectUpdate):
        return self.service.update_project(project_id, project_in)

    def delete_project(self, project_id: int):
        return self.service.delete_project(project_id)

    def toggle_status(self, project_id: int):
        return self.service.toggle_status(project_id)

    def get_stats(self):
        return self.service.get_stats()

    def get_assigned_items(self, project_id: int):
        return self.service.get_assigned_items(project_id)

    def get_summary_report(
        self,
        project_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        search: Optional[str] = None,
        tracking_type: Optional[str] = None,
    ):
        return self.service.get_summary_report(
            project_id=project_id,
            date_from=date_from,
            date_to=date_to,
            status=status,
            warehouse_id=warehouse_id,
            search=search,
            tracking_type=tracking_type,
        )
