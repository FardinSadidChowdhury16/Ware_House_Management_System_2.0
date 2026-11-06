from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.warehouse import WarehouseResponse


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[int] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class PermissionResponse(BaseModel):
    id: int
    name: str
    module: str

    class Config:
        from_attributes = True


class RoleResponse(RoleBase):
    id: int
    permissions: List[PermissionResponse] = Field(default_factory=list)
    users_count: int = 0

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    name: str
    user_name: Optional[str] = None
    email: EmailStr


class UserCreate(UserBase):
    password: str
    status: bool = True
    role_id: Optional[int] = None
    warehouse_ids: List[int] = Field(default_factory=list)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    user_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    status: Optional[bool] = None
    role_id: Optional[int] = None
    warehouse_ids: Optional[List[int]] = None


class UserPasswordChange(BaseModel):
    password: str = Field(..., min_length=4)


class UserResponse(UserBase):
    id: int
    status: bool
    password: Optional[str] = None
    role: Optional[RoleResponse] = None
    warehouses: List[WarehouseResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True