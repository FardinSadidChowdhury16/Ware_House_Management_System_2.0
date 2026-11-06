from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.roles.roles_repository import RoleRepository
from app.schemas.user import RoleCreate, RoleUpdate

class RoleService:
    def __init__(self, db: Session):
        self.repo = RoleRepository(db)

    def get_permissions(self):
        return self.repo.get_all_permissions()

    def get_roles(self):
        roles = self.repo.get_all_roles()
        result = []
        for role in roles:
            role_dict = {
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "permissions": role.permissions,
                "users_count": len(role.users) if role.users else 0,
            }
            result.append(role_dict)
        return result

    def get_role_by_id(self, role_id: int):
        role = self.repo.get_role_by_id(role_id)
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        return role

    def create_role(self, role_in: RoleCreate):
        return self.repo.create_role(
            name=role_in.name,
            description=role_in.description,
            permission_ids=role_in.permission_ids
        )

    def update_role(self, role_id: int, role_in: RoleUpdate):
        role = self.get_role_by_id(role_id)
        return self.repo.update_role(
            role=role,
            name=role_in.name,
            description=role_in.description,
            permission_ids=role_in.permission_ids
        )

    def delete_role(self, role_id: int):
        role = self.get_role_by_id(role_id)
        if role.users and len(role.users) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This role is assigned to users, you cannot delete it."
            )
        self.repo.delete_role(role)
        return {"message": "Role deleted successfully"}