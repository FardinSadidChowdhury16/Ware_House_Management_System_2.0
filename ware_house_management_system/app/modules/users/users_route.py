from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.core.permissions import require_permission
from app.models.access_control import User
from app.modules.users.users_controller import UserController
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserPasswordChange

router = APIRouter()


@router.get("", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user_read")),
):
    controller = UserController(db)
    return controller.get_users(skip=skip, limit=limit, current_user=current_user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user_write")),
):
    controller = UserController(db)
    return controller.create_user(user_in, current_user=current_user)


@router.get("/{id}", response_model=UserResponse)
def get_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user_read")),
):
    controller = UserController(db)
    return controller.get_user(id, current_user=current_user)


@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user_write")),
):
    controller = UserController(db)
    return controller.update_user(id, user_in, current_user=current_user)


@router.patch("/{id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user_write")),
):
    controller = UserController(db)
    return controller.toggle_status(id, current_user=current_user)


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user_write")),
):
    controller = UserController(db)
    return controller.delete_user(id, current_user=current_user)
@router.put("/{id}/password", response_model=UserResponse)
def change_user_password(
    id: int,
    data: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user_write")),
):
    controller = UserController(db)
    return controller.change_password(id, data.password, current_user=current_user)
