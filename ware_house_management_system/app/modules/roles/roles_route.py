from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.core.permissions import require_permission
from app.modules.roles.roles_controller import RoleController
from app.schemas.user import RoleResponse, RoleCreate, RoleUpdate, PermissionResponse

router = APIRouter()

@router.get("/permissions", response_model=List[PermissionResponse])
def get_permissions(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return RoleController(db).get_permissions()

@router.get("", response_model=List[RoleResponse], include_in_schema=False)
@router.get("/roles", response_model=List[RoleResponse])
def get_roles(db: Session = Depends(get_db), current_user=Depends(require_permission("user_read"))):
    return RoleController(db).get_roles()

@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(role_in: RoleCreate, db: Session = Depends(get_db), current_user=Depends(require_permission("user_write"))):
    return RoleController(db).create_role(role_in)

@router.get("/{id}", response_model=RoleResponse, include_in_schema=False)
@router.get("/roles/{id}", response_model=RoleResponse)
def get_role(id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("user_read"))):
    return RoleController(db).get_role(id)

@router.put("/{id}", response_model=RoleResponse, include_in_schema=False)
@router.put("/roles/{id}", response_model=RoleResponse)
def update_role(id: int, role_in: RoleUpdate, db: Session = Depends(get_db), current_user=Depends(require_permission("user_write"))):
    return RoleController(db).update_role(id, role_in)

@router.delete("/{id}", include_in_schema=False)
@router.delete("/roles/{id}")
def delete_role(id: int, db: Session = Depends(get_db), current_user=Depends(require_permission("user_write"))):
    return RoleController(db).delete_role(id)