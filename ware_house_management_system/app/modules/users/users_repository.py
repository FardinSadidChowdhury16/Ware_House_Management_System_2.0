from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models.access_control import User
from app.models.warehouse import Warehouse


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100, include_deleted: bool = False) -> List[User]:
        query = (
            self.db.query(User)
            .options(joinedload(User.role), joinedload(User.warehouses))
        )
        if not include_deleted:
            query = query.filter(User.is_deleted.is_(False))
        return (
            query.offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, user_id: int, include_deleted: bool = False) -> Optional[User]:
        query = (
            self.db.query(User)
            .options(joinedload(User.role), joinedload(User.warehouses))
            .filter(User.id == user_id)
        )
        if not include_deleted:
            query = query.filter(User.is_deleted.is_(False))
        return query.first()

    def create(self, user_data: dict, warehouse_ids: List[int] = None) -> User:
        db_user = User(**user_data)
        if warehouse_ids:
            warehouses = self.db.query(Warehouse).filter(Warehouse.id.in_(warehouse_ids)).all()
            db_user.warehouses = warehouses
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def update(self, user: User, update_data: dict, warehouse_ids: List[int] = None) -> User:
        for field, value in update_data.items():
            setattr(user, field, value)
        if warehouse_ids is not None:
            warehouses = self.db.query(Warehouse).filter(Warehouse.id.in_(warehouse_ids)).all()
            user.warehouses = warehouses
        self.db.commit()
        self.db.refresh(user)
        return user

    def soft_delete(self, user: User) -> User:
        user.is_deleted = True
        user.deleted_at = func.now()
        user.status = False
        self.db.commit()
        self.db.refresh(user)
        return user
