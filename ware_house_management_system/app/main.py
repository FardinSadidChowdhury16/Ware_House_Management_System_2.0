from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_router
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    global_exception_handler,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.database import SessionLocal
    from app.db.init_db import init_db
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# 1. CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Custom Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 3. Global Exception Handlers Setup
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# 4. Include API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root_check():
    return {"status": "healthy", "project": settings.PROJECT_NAME}