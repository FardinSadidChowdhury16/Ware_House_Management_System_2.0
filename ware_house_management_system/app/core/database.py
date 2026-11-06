from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.base import Base

# Lazily initialize engine and session factory to avoid importing heavy
# application settings (and transitively pydantic) at module import time.
_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        from app.core.config import settings

        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
    return _engine


def get_session_local():
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal


def get_db():
    """Dependency to yield Database Session per HTTP request."""
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Backwards-compatible factory used throughout the codebase. Many modules
# import `SessionLocal` and call it to obtain a DB session. Expose a callable
# named `SessionLocal` that lazily constructs the sessionmaker and returns
# a session when invoked, avoiding eager imports of application settings.
def SessionLocal():
    return get_session_local()()