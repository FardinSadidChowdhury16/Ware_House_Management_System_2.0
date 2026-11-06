from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.access_control import Role, Permission

class RoleRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all_permissions(self) -> List[Permission]:
        from sqlalchemy import case
        return (
            self.db.query(Permission)
            .order_by(
                Permission.module,
                case(
                    (Permission.name.like("%_read"), 1),
                    (Permission.name.like("%_write"), 2),
                    (Permission.name.like("%_approve"), 3),
                    else_=4,
                ),
                Permission.name,
            )
            .all()
        )

    def get_all_roles(self) -> List[Role]:
        return self.db.query(Role).options(joinedload(Role.permissions), joinedload(Role.users)).all()

    def get_role_by_id(self, role_id: int) -> Optional[Role]:
        return self.db.query(Role).options(joinedload(Role.permissions)).filter(Role.id == role_id).first()

    def create_role(self, name: str, description: Optional[str], permission_ids: List[int]) -> Role:
        role = Role(name=name, description=description)
        if permission_ids:
            perms = self.db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
            role.permissions = perms
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update_role(self, role: Role, name: Optional[str], description: Optional[str], permission_ids: Optional[List[int]]) -> Role:
        if name:
            role.name = name
        if description is not None:
            role.description = description
        if permission_ids is not None:
            perms = self.db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
            role.permissions = perms
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete_role(self, role: Role) -> None:
        self.db.delete(role)
        self.db.commit()