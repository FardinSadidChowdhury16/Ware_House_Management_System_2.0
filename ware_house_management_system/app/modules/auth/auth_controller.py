from sqlalchemy.orm import Session
from app.modules.auth.auth_service import AuthService
from app.schemas.auth import LoginRequest


class AuthController:
    def __init__(self, db: Session):
        self.service = AuthService(db)

    def login(self, login_data: LoginRequest):
        return self.service.login_user(login_data)