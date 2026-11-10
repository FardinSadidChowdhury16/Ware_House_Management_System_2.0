from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project
from app.modules.projects.projects_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: Session):
        self.repository = ProjectRepository(db)

    def get_projects(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[Project], int]:
        return self.repository.get_projects(skip=skip, limit=limit, search=search, status=status)

    def get_project_by_id(self, project_id: int) -> Project:
        project = self.repository.get_project_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID {project_id} not found."
            )
        return project

    def create_project(self, project_in: ProjectCreate) -> Project:
        # Check code uniqueness
        existing = self.repository.get_project_by_code(project_in.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project code '{project_in.code.upper()}' already exists. Please choose a unique code."
            )
        return self.repository.create_project(project_in)

    def update_project(self, project_id: int, project_in: ProjectUpdate) -> Project:
        project = self.repository.get_project_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID {project_id} not found."
            )

        if project_in.code and project_in.code.strip().upper() != project.code:
            existing = self.repository.get_project_by_code(project_in.code)
            if existing and existing.id != project_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Project code '{project_in.code.upper()}' is already in use by another project."
                )

        updated = self.repository.update_project(project_id, project_in)
        return updated

    def delete_project(self, project_id: int) -> dict:
        project = self.repository.get_project_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID {project_id} not found."
            )
        self.repository.delete_project(project_id)
        return {"message": f"Project '{project.name}' deleted successfully."}

    def toggle_status(self, project_id: int) -> Project:
        project = self.repository.toggle_status(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID {project_id} not found."
            )
        return project

    def get_stats(self) -> dict:
        return self.repository.get_stats()

    def get_assigned_items(self, project_id: int) -> dict:
        self.get_project_by_id(project_id)
        return self.repository.get_assigned_items(project_id)

    def get_summary_report(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        status: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> dict:
        return self.repository.get_project_summary_report(
            date_from=date_from,
            date_to=date_to,
            status=status,
            warehouse_id=warehouse_id,
            search=search,
        )
