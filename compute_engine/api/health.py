from fastapi import APIRouter
from datetime import datetime
import psutil

router = APIRouter()

@router.get("")
async def health_check():
    """Simple health check endpoint for Tauri to detect if engine is ready"""
    return {
        "status": "healthy",
        "service": "novem-compute-engine",
        "timestamp": datetime.utcnow().isoformat(),
        "mode": "embedded"
    }

@router.get("/status")
async def detailed_status():
    """Detailed status with system resources"""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "status": "healthy",
            "service": "novem-compute-engine",
            "timestamp": datetime.utcnow().isoformat(),
            "mode": "embedded",
            "resources": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "memory_total_gb": memory.total / (1024**3),
                "disk_available_gb": disk.free / (1024**3),
                "disk_total_gb": disk.total / (1024**3),
            }
        }
    except Exception as e:
        return {
            "status": "healthy",
            "service": "novem-compute-engine",
            "timestamp": datetime.utcnow().isoformat(),
            "mode": "embedded",
            "error": str(e)
        }