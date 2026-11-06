from sqlalchemy.orm import Session
from app.modules.roles.roles_service import RoleService
from app.schemas.user import RoleCreate, RoleUpdate

class RoleController:
    def __init__(self, db: Session):
        self.service = RoleService(db)

    def get_permissions(self):
        return self.service.get_permissions()

    def get_roles(self):
        return self.service.get_roles()

    def get_role(self, role_id: int):
        return self.service.get_role_by_id(role_id)

    def create_role(self, role_in: RoleCreate):
        return self.service.create_role(role_in)

    def update_role(self, role_id: int, role_in: RoleUpdate):
        return self.service.update_role(role_id, role_in)

    def delete_role(self, role_id: int):
        return self.service.delete_role(role_id)