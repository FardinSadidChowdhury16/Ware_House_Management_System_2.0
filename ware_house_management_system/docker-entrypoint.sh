#!/bin/sh
set -e

# Current models include columns the Alembic revisions do not, so a fresh
# database is created from SQLAlchemy metadata before the API starts.
python - <<'PY'
from app.core.database import get_engine
from app.models import Base

Base.metadata.create_all(bind=get_engine())
PY

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/app
