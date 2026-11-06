from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core import security
from app.models.access_control import User
from app.schemas.auth import LoginRequest


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def login_user(self, login_data: LoginRequest):
        login_value = login_data.user_name_or_email.strip()
        user = (
            self.db.query(User)
            .filter(
                (func.lower(User.user_name) == login_value.lower())
                | (func.lower(User.email) == login_value.lower())
            )
            .first()
        )
        if not user or not security.verify_password(login_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
            )
        if getattr(user, "is_deleted", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account has been deleted",
            )
        if not user.status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive",
            )

        token = security.create_access_token(subject=user.id)
        return {"access_token": token, "token_type": "bearer"}
