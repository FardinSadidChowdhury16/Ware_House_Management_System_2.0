import sys
import logging
from pathlib import Path

# Log directory setup
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# Logger Configuration
def setup_logger():
    logger = logging.getLogger("warehouse_api")
    logger.setLevel(logging.INFO)

    # Formatter
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File Handler for Errors
    file_handler = logging.FileHandler(LOG_DIR / "app_errors.log")
    file_handler.setLevel(logging.ERROR)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger

logger = setup_logger()