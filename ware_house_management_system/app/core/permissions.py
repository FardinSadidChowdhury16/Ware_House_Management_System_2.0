"""
Permission-based dependency factory for FastAPI routes.

Usage example:
    @router.post("/approvals/{id}/approve")
    def approve(
        id: int,
        current_user: User = Depends(require_permission("stock_in_approve")),
        db: Session = Depends(get_db),
    ):
        ...
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.access_control import User, Role


def require_permission(permission_name: str):
    """
    Returns a FastAPI dependency that:
    1. Verifies the user is authenticated (via get_current_user)
    2. Verifies the user's role has the given permission (or is Admin)
    Raises HTTP 403 if the permission is missing.
    """

    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        from sqlalchemy.orm import joinedload
        user = (
            db.query(User)
            .options(joinedload(User.role).joinedload(Role.permissions))
            .filter(User.id == current_user.id)
            .first()
        )
        if not user or not user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: permission '{permission_name}' required.",
            )

        # Admin bypass
        role_name = (user.role.name or "").lower()
        if role_name in ["admin", "administrator", "super administrator", "superadmin"]:
            return user

        user_permission_names = {p.name for p in user.role.permissions}
        if permission_name not in user_permission_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: permission '{permission_name}' required.",
            )
        return user

    return _check


def require_any_permission(*permission_names: str):
    """
    Returns a FastAPI dependency that checks if the user has ANY of the given permissions.
    """

    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        from sqlalchemy.orm import joinedload
        user = (
            db.query(User)
            .options(joinedload(User.role).joinedload(Role.permissions))
            .filter(User.id == current_user.id)
            .first()
        )
        if not user or not user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: one of {permission_names} permissions required.",
            )

        role_name = (user.role.name or "").lower()
        if role_name in ["admin", "administrator", "super administrator", "superadmin"]:
            return user

        user_permission_names = {p.name for p in user.role.permissions}
        if not any(p in user_permission_names for p in permission_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: one of {permission_names} permissions required.",
            )
        return user

    return _check
