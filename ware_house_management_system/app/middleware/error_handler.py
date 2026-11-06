from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.middleware.logger import logger


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Custom handler for HTTP Exceptions (400, 401, 404, etc.)"""
    logger.warning(f"HTTP Error {exc.status_code} on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status_code": exc.status_code,
            "message": exc.detail,
            "data": None,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for Pydantic Schema Validation Errors (422)"""
    logger.warning(f"Validation Error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "status_code": 422,
            "message": "Input validation failed",
            "errors": exc.errors(),
            "data": None,
        },
    )


async def global_exception_handler(request: Request, exc: Exception):
    """Custom handler for any unexpected Internal Server Errors (500)"""
    logger.error(f"Unhandled Server Error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "status_code": 500,
            "message": "An unexpected internal server error occurred.",
            "data": None,
        },
    )