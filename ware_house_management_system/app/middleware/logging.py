import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.middleware.logger import logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log Request Info
        logger.info(f"Incoming Request: {request.method} {request.url.path}")

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Log Response Status
            logger.info(
                f"Completed: {request.method} {request.url.path} "
                f"- Status: {response.status_code} - Time: {process_time:.2f}ms"
            )
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
            return response

        except Exception as exc:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"Failed Request: {request.method} {request.url.path} "
                f"- Time: {process_time:.2f}ms - Error: {str(exc)}"
            )
            raise exc