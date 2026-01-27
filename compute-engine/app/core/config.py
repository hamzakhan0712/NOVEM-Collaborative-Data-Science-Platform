from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    APP_NAME: str = "NOVEM Compute Engine"
    VERSION: str = "0.1.0"

    HOST: str = "127.0.0.1"
    PORT: int = 8765

    BASE_DIR: Path = Path.cwd()
    DATA_DIR: Path = BASE_DIR / "data"
    METADATA_DIR: Path = BASE_DIR / "metadata"

    DUCKDB_PATH: str = str(METADATA_DIR / "analytics.duckdb")
    SQLITE_PATH: str = str(METADATA_DIR / "local_metadata.db")

    MAX_MEMORY_MB: int = 4096
    MAX_WORKERS: int = 4

    class Config:
        env_file = ".env"

settings = Settings()
