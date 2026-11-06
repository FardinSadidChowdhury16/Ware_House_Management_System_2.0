from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WarehouseBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None


class WarehouseResponse(WarehouseBase):
    id: int
    status: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True