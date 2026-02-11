"""
Health Check & System Status API
Provides compute engine health and resource information
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
import logging
import psutil
from datetime import datetime

from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    duckdb_connected: bool


class CPUInfo(BaseModel):
    percent: float
    count: int
    max_cores: int


class MemoryInfo(BaseModel):
    used_gb: float
    available_gb: float
    percent: float
    limit_gb: float


class DiskInfo(BaseModel):
    used_gb: float
    available_gb: float
    percent: float


class ComputeEngineInfo(BaseModel):
    version: str
    data_dir: str
    offline_mode: bool


class SystemStatusResponse(BaseModel):
    cpu: CPUInfo
    memory: MemoryInfo
    disk: DiskInfo
    compute_engine: ComputeEngineInfo


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Basic health check endpoint
    Returns service status and DuckDB connection
    """
    try:
        # Import here to avoid circular dependency
        from core.database import duckdb_manager
        
        # Check if DuckDB is connected
        duckdb_connected = False
        try:
            if duckdb_manager.conn is not None:
                # Test the connection with a simple query
                duckdb_manager.conn.execute("SELECT 1").fetchone()
                duckdb_connected = True
        except Exception as e:
            logger.warning(f"DuckDB connection check failed: {e}")
        
        return HealthResponse(
            status="healthy",
            service="novem-compute-engine",
            timestamp=datetime.utcnow().isoformat() + "Z",
            duckdb_connected=duckdb_connected
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system", response_model=SystemStatusResponse)
async def system_status():
    """
    Detailed system status
    Used by frontend to display resource usage
    """
    try:
        # Get CPU info
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count(logical=True)
        
        # Get memory info
        memory = psutil.virtual_memory()
        memory_used_gb = (memory.total - memory.available) / (1024 ** 3)
        memory_available_gb = memory.available / (1024 ** 3)
        memory_total_gb = memory.total / (1024 ** 3)
        
        # Get disk info
        disk = psutil.disk_usage('/')
        disk_used_gb = disk.used / (1024 ** 3)
        disk_available_gb = disk.free / (1024 ** 3)
        
        return SystemStatusResponse(
            cpu=CPUInfo(
                percent=round(cpu_percent, 1),
                count=cpu_count,
                max_cores=settings.max_cpu_cores if hasattr(settings, 'max_cpu_cores') else cpu_count
            ),
            memory=MemoryInfo(
                used_gb=round(memory_used_gb, 2),
                available_gb=round(memory_available_gb, 2),
                percent=round(memory.percent, 1),
                limit_gb=settings.max_memory_gb if hasattr(settings, 'max_memory_gb') else round(memory_total_gb, 2)
            ),
            disk=DiskInfo(
                used_gb=round(disk_used_gb, 2),
                available_gb=round(disk_available_gb, 2),
                percent=round(disk.percent, 1)
            ),
            compute_engine=ComputeEngineInfo(
                version="0.1.0",
                data_dir=str(settings.data_dir),
                offline_mode=False
            )
        )
    except Exception as e:
        logger.error(f"System status check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/detailed")
async def detailed_health():
    """
    Comprehensive health check including all components
    """
    try:
        from core.database import duckdb_manager, sqlite_manager
        
        health_data = {
            "status": "healthy",
            "service": "novem-compute-engine",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": "0.1.0",
            "components": {}
        }
        
        # Check DuckDB
        try:
            if duckdb_manager.conn is not None:
                duckdb_manager.conn.execute("SELECT 1").fetchone()
                health_data["components"]["duckdb"] = {
                    "status": "healthy",
                    "version": duckdb_manager.conn.execute("SELECT version()").fetchone()[0]
                }
            else:
                health_data["components"]["duckdb"] = {
                    "status": "disconnected",
                    "message": "Connection not initialized"
                }
        except Exception as e:
            health_data["components"]["duckdb"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # Check SQLite
        try:
            if sqlite_manager.conn is not None:
                sqlite_manager.conn.execute("SELECT 1").fetchone()
                health_data["components"]["sqlite"] = {
                    "status": "healthy"
                }
            else:
                health_data["components"]["sqlite"] = {
                    "status": "disconnected",
                    "message": "Connection not initialized"
                }
        except Exception as e:
            health_data["components"]["sqlite"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # System resources
        try:
            memory = psutil.virtual_memory()
            health_data["components"]["system"] = {
                "status": "healthy",
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "memory_percent": memory.percent,
                "disk_percent": psutil.disk_usage('/').percent
            }
        except Exception as e:
            health_data["components"]["system"] = {
                "status": "error",
                "error": str(e)
            }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))