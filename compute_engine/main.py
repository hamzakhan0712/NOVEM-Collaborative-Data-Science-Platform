"""
NOVEM Local Compute Engine - Embedded Mode
FastAPI-based analytical processor running inside Tauri desktop app
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
import os

from core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('compute_engine.log')
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic for embedded mode"""
    logger.info("Starting NOVEM Compute Engine (Embedded Mode)...")
    logger.info(f"Working directory: {os.getcwd()}")
    logger.info(f"Data directory: {settings.data_dir}")
    logger.info(f"Max memory: {settings.max_memory_gb}GB")
    logger.info(f"Max CPU cores: {settings.max_cpu_cores}")
    
    initialized = {
        "duckdb": False,
        "sqlite": False,
        "monitor": False
    }
    
    try:
        from core.database import duckdb_manager, sqlite_manager
        from core.system_monitor import system_monitor
        
        logger.info("Setting up DuckDB connection...")
        try:
            if duckdb_manager.conn is None:
                duckdb_manager._connect()
            logger.info("DuckDB ready")
            initialized["duckdb"] = True
        except Exception as e:
            logger.warning(f"DuckDB initialization warning: {e}")
        
        logger.info("Setting up SQLite connection...")
        try:
            if sqlite_manager.conn is None:
                sqlite_manager._connect()
            logger.info("SQLite ready")
            initialized["sqlite"] = True
        except Exception as e:
            logger.warning(f"SQLite initialization warning: {e}")
        
        logger.info("Starting system monitor...")
        try:
            system_monitor.start()
            logger.info("System monitor running")
            initialized["monitor"] = True
        except Exception as e:
            logger.warning(f"System monitor warning: {e}")
        
        logger.info("Embedded compute engine started successfully")
        logger.info(f"API available at: http://{settings.host}:{settings.port}")
        
        init_status = ", ".join([k for k, v in initialized.items() if v])
        logger.info(f"Initialized: {init_status}")
        
    except Exception as e:
        logger.error(f"Startup error: {e}", exc_info=True)
        logger.warning("Starting with limited functionality")
    
    yield
    
    logger.info("Shutting down compute engine...")
    try:
        from core.database import duckdb_manager, sqlite_manager
        from core.system_monitor import system_monitor
        
        if initialized["monitor"]:
            try:
                system_monitor.stop()
                logger.info("System monitor stopped")
            except Exception as e:
                logger.error(f"Error stopping monitor: {e}")
        
        if initialized["duckdb"]:
            try:
                duckdb_manager.close()
                logger.info("DuckDB closed")
            except Exception as e:
                logger.error(f"Error closing DuckDB: {e}")
        
        if initialized["sqlite"]:
            try:
                sqlite_manager.close()
                logger.info("SQLite closed")
            except Exception as e:
                logger.error(f"Error closing SQLite: {e}")
        
        logger.info("Compute engine shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}", exc_info=True)


app = FastAPI(
    title="NOVEM Compute Engine (Embedded)",
    description="Local analytical processor embedded in NOVEM desktop app",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
        "http://localhost:1420",
        "http://127.0.0.1:1420",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api import health, auth, sync

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(sync.router, prefix="/sync", tags=["Sync"])


@app.get("/")
async def root():
    """Root endpoint - confirms engine is running"""
    return {
        "service": "novem-compute-engine-embedded",
        "version": "0.1.0",
        "status": "running",
        "mode": "embedded",
        "docs": "/docs",
        "health": "/health",
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting embedded server on {settings.host}:{settings.port}")
    
    try:
        uvicorn.run(
            app,
            host=settings.host,
            port=settings.port,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("Server stopped")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)