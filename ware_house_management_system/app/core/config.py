from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Warehouse Management System API"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "0.1.0"

    # Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "wms_user"
    POSTGRES_PASSWORD: str = "wms_password"
    POSTGRES_DB: str = "wms_db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: Optional[str] = None

    # JWT Settings
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_IN_PRODUCTION_32_BYTES_LONG"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 Day

    # AWS S3 Settings
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "ap-southeast-1"
    AWS_S3_BUCKET_NAME: str = "solshare-inventory-management-system-files"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+psycopg2://{self.POSTGRES_USER}:"
                f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:"
                f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )


settings = Settings()
