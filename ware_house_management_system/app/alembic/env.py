import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Ensure the repository root is on sys.path so `app` imports resolve.
ROOT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT_PATH not in sys.path:
    sys.path.insert(0, ROOT_PATH)

from app.models import Base

from app.models.access_control import User, Role, Permission
from app.models.party import Customer, Supplier
from app.models.warehouse import Warehouse

config = context.config
fileConfig(config.config_file_name)

# Prefer an explicit DATABASE_URL environment variable for Alembic runs.
# If not provided, build one from POSTGRES_* environment variables with
# the same defaults used by the application.
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    pg_user = os.environ.get("POSTGRES_USER", "wms_user")
    pg_pass = os.environ.get("POSTGRES_PASSWORD", "wms_password")
    pg_server = os.environ.get("POSTGRES_SERVER", "localhost")
    pg_port = os.environ.get("POSTGRES_PORT", "5432")
    pg_db = os.environ.get("POSTGRES_DB", "wms_db")
    db_url = (
        f"postgresql+psycopg2://{pg_user}:{pg_pass}@{pg_server}:{pg_port}/{pg_db}"
    )

config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
