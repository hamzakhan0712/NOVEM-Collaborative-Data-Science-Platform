"""
Compute Engine Configuration
Manages local paths, resource limits, and engine settings
"""
from pydantic_settings import BaseSettings
from pathlib import Path
import os
from typing import Optional


class Settings(BaseSettings):
    """Compute Engine Settings"""
    
    # Server Configuration
    host: str = "127.0.0.1"
    port: int = 8001
    secret_key: str = "dev-secret-key-change-in-production"
    
    # Backend API
    backend_api_url: str = "http://127.0.0.1:8000/api"
    
    # Storage Configuration
    app_data_dir: Path = Path.home() / ".novem"
    data_dir: Path = Path.home() / ".novem" / "data"
    duckdb_path: Path = Path.home() / ".novem" / "data" / "novem.duckdb"
    sqlite_path: Path = Path.home() / ".novem" / "data" / "novem_metadata.db"
    temp_dir: Path = Path.home() / ".novem" / "temp"
    logs_dir: Path = Path.home() / ".novem" / "logs"
    
    # Resource Limits
    max_memory_gb: int = 4
    max_cpu_cores: int = 4
    max_dataset_size_gb: int = 10
    
    # Sync Settings
    sync_interval_seconds: int = 300
    offline_grace_period_days: int = 7
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "compute_engine.log"
    
    # Security
    access_token_expire_minutes: int = 60
    
    class Config:
        env_file = ".env"
        env_prefix = "COMPUTE_ENGINE_"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Create necessary directories if they don't exist"""
        for directory in [
            self.app_data_dir,
            self.data_dir,
            self.temp_dir,
            self.logs_dir
        ]:
            directory.mkdir(parents=True, exist_ok=True)
    
    @property
    def full_log_path(self) -> Path:
        """Get full path to log file"""
        return self.logs_dir / self.log_file


# Global settings instance
settings = Settings()