from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission
from app.models.access_control import User
from app.modules.projects.projects_controller import ProjectController
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.get("/stats")
def get_project_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = ProjectController(db)
    return controller.get_stats()


@router.get("")
def get_projects(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = ProjectController(db)
    return controller.get_projects(skip=skip, limit=limit, search=search, status=status)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("project_write")),
):
    controller = ProjectController(db)
    return controller.create_project(project_in)


@router.get("/{id}", response_model=ProjectResponse)
def get_project(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = ProjectController(db)
    return controller.get_project(id)


@router.get("/{id}/items")
def get_project_assigned_items(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    controller = ProjectController(db)
    return controller.get_assigned_items(id)


@router.put("/{id}", response_model=ProjectResponse)
def update_project(
    id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("project_write")),
):
    controller = ProjectController(db)
    return controller.update_project(id, project_in)


@router.delete("/{id}")
def delete_project(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("project_write")),
):
    controller = ProjectController(db)
    return controller.delete_project(id)


@router.patch("/{id}/toggle-status", response_model=ProjectResponse)
def toggle_project_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("project_write")),
):
    controller = ProjectController(db)
    return controller.toggle_status(id)
