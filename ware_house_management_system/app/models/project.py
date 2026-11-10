from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    location = Column(String(255), nullable=False)
    contact_info = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="active", nullable=False)  # active, completed, on_hold, cancelled
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
