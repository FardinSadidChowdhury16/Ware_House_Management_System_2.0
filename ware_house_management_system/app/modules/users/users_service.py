import re

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core import security
from app.modules.users.users_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    @staticmethod
    def _generate_user_name(name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        return slug or "user"

    @staticmethod
    def _can_view_password(current_user) -> bool:
        if not current_user:
            return False

        email = (getattr(current_user, "email", "") or "").lower()
        if email == "admin@admin.com":
            return True

        user_name = (getattr(current_user, "user_name", "") or "").lower()
        if user_name == "superadmin":
            return True

        role = getattr(current_user, "role", None)
        role_name = (getattr(role, "name", "") or "").lower()
        return role_name in {"admin", "super administrator", "superadmin"}

    def _serialize_user(self, user, current_user=None):
        data = {
            "id": user.id,
            "name": user.name,
            "user_name": user.user_name,
            "email": user.email,
            "status": bool(user.status),
            "role": user.role,
            "warehouses": user.warehouses,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "password": user.password if self._can_view_password(current_user) else None,
        }
        return data

    def fetch_all_users(self, skip: int = 0, limit: int = 100, current_user=None):
        users = self.repo.get_all(skip=skip, limit=limit)
        return [self._serialize_user(user, current_user=current_user) for user in users]

    def fetch_user_by_id(self, user_id: int, current_user=None):
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return self._serialize_user(user, current_user=current_user)

    def add_new_user(self, user_in: UserCreate, current_user=None):
        user_data = user_in.model_dump(exclude={"warehouse_ids"})
        if not user_data.get("user_name"):
            user_data["user_name"] = self._generate_user_name(user_in.name)
        user_data["status"] = bool(user_data.get("status", True))
        user_data["password"] = security.get_password_hash(user_data["password"])
        user = self.repo.create(user_data, warehouse_ids=user_in.warehouse_ids)
        return self._serialize_user(user, current_user=current_user)

    def update_user_profile(self, user_id: int, user_in: UserUpdate, current_user=None):
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        update_data = user_in.model_dump(exclude_unset=True, exclude={"warehouse_ids"})
        if "user_name" in update_data:
            if not update_data["user_name"]:
                update_data.pop("user_name", None)
        if "password" in update_data:
            raw_pwd = update_data["password"]
            if raw_pwd and isinstance(raw_pwd, str) and raw_pwd.strip():
                update_data["password"] = security.get_password_hash(raw_pwd.strip())
            else:
                update_data.pop("password", None)
        if "status" in update_data:
            update_data["status"] = bool(update_data["status"])
        updated_user = self.repo.update(user, update_data, warehouse_ids=user_in.warehouse_ids)
        return self._serialize_user(updated_user, current_user=current_user)

    def change_user_password(self, user_id: int, new_password: str, current_user=None):
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        clean_pwd = (new_password or "").strip()
        if len(clean_pwd) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 4 characters long",
            )
        hashed = security.get_password_hash(clean_pwd)
        updated_user = self.repo.update(user, {"password": hashed})
        return self._serialize_user(updated_user, current_user=current_user)

    def toggle_user_status(self, user_id: int, current_user=None):
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        updated_user = self.repo.update(user, {"status": not user.status})
        return self._serialize_user(updated_user, current_user=current_user)

    def delete_user_account(self, user_id: int, current_user=None):
        user = self.repo.get_by_id(user_id, include_deleted=True)
        if not user or user.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        if current_user and getattr(current_user, "id", None) == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own user account",
            )
        user_email = (user.email or "").lower()
        user_name = (user.user_name or "").lower()
        if user_email == "admin@admin.com" or user_name == "superadmin" or user.id == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Primary administrator account cannot be deleted",
            )
        self.repo.soft_delete(user)
        return {"message": f"User '{user.name}' has been deleted successfully", "id": user_id}
