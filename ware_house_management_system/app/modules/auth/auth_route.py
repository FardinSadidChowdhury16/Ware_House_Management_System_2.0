from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.access_control import User
from app.modules.auth.auth_controller import AuthController
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserResponse

router = APIRouter()


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    controller = AuthController(db)
    return controller.login(login_data)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user