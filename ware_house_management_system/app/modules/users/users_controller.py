from sqlalchemy.orm import Session
from app.modules.users.users_service import UserService
from app.schemas.user import UserCreate, UserUpdate


class UserController:
    def __init__(self, db: Session):
        self.service = UserService(db)

    def get_users(self, skip: int, limit: int, current_user=None):
        return self.service.fetch_all_users(skip=skip, limit=limit, current_user=current_user)

    def get_user(self, user_id: int, current_user=None):
        return self.service.fetch_user_by_id(user_id, current_user=current_user)

    def create_user(self, user_in: UserCreate, current_user=None):
        return self.service.add_new_user(user_in, current_user=current_user)

    def update_user(self, user_id: int, user_in: UserUpdate, current_user=None):
        return self.service.update_user_profile(user_id, user_in, current_user=current_user)

    def toggle_status(self, user_id: int, current_user=None):
        return self.service.toggle_user_status(user_id, current_user=current_user)

    def delete_user(self, user_id: int, current_user=None):
        return self.service.delete_user_account(user_id, current_user=current_user)
    def change_password(self, user_id: int, new_password: str, current_user=None):
        return self.service.change_user_password(user_id, new_password, current_user=current_user)
