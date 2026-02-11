"""
NOVEM Local Compute Engine
FastAPI-based analytical processor running on user's machine
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys

from core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown logic
    """
    logger.info("🚀 Starting NOVEM Compute Engine...")
    logger.info(f"📁 Data directory: {settings.data_dir}")
    logger.info(f"💾 Max memory: {settings.max_memory_gb}GB")
    logger.info(f"🖥️  Max CPU cores: {settings.max_cpu_cores}")
    
    # Track what we successfully initialized
    initialized = {
        "duckdb": False,
        "sqlite": False,
        "monitor": False
    }
    
    try:
        # Import managers here
        from core.database import duckdb_manager, sqlite_manager
        from core.system_monitor import system_monitor
        
        # Initialize DuckDB
        logger.info("📊 Setting up DuckDB connection...")
        try:
            if duckdb_manager.conn is None:
                duckdb_manager._connect()
            logger.info("✅ DuckDB ready")
            initialized["duckdb"] = True
        except Exception as e:
            logger.warning(f"⚠️ DuckDB initialization warning: {e}")
        
        # Initialize SQLite
        logger.info("💾 Setting up SQLite connection...")
        try:
            if sqlite_manager.conn is None:
                sqlite_manager._connect()
            logger.info("✅ SQLite ready")
            initialized["sqlite"] = True
        except Exception as e:
            logger.warning(f"⚠️ SQLite initialization warning: {e}")
        
        # Start system monitor
        logger.info("📈 Starting system monitor...")
        try:
            system_monitor.start()
            logger.info("✅ System monitor running")
            initialized["monitor"] = True
        except Exception as e:
            logger.warning(f"⚠️ System monitor warning: {e}")
        
        logger.info("✅ Compute Engine started successfully")
        logger.info(f"🌐 API available at: http://{settings.host}:{settings.port}")
        logger.info(f"📖 API docs at: http://{settings.host}:{settings.port}/docs")
        
        # Log what was initialized
        init_status = ", ".join([k for k, v in initialized.items() if v])
        logger.info(f"✓ Initialized: {init_status}")
        
    except Exception as e:
        logger.error(f"❌ Startup error: {e}", exc_info=True)
        logger.warning("⚠️ Starting with limited functionality")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down NOVEM Compute Engine...")
    try:
        from core.database import duckdb_manager, sqlite_manager
        from core.system_monitor import system_monitor
        
        if initialized["monitor"]:
            try:
                system_monitor.stop()
                logger.info("✅ System monitor stopped")
            except Exception as e:
                logger.error(f"⚠️ Error stopping monitor: {e}")
        
        if initialized["duckdb"]:
            try:
                duckdb_manager.close()
                logger.info("✅ DuckDB closed")
            except Exception as e:
                logger.error(f"⚠️ Error closing DuckDB: {e}")
        
        if initialized["sqlite"]:
            try:
                sqlite_manager.close()
                logger.info("✅ SQLite closed")
            except Exception as e:
                logger.error(f"⚠️ Error closing SQLite: {e}")
        
        logger.info("✅ Compute Engine shutdown complete")
    except Exception as e:
        logger.error(f"⚠️ Error during shutdown: {e}", exc_info=True)


# Create FastAPI app
app = FastAPI(
    title="NOVEM Compute Engine",
    description="Local analytical processor for NOVEM platform",
    version="0.1.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:1420",  # Tauri dev
        "tauri://localhost",      # Tauri production
        "http://tauri.localhost", # Tauri production (alternate)
        "http://localhost:3000",  # Additional dev port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from api import health, auth, sync

# Register routes
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(sync.router, prefix="/sync", tags=["Sync"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "novem-compute-engine",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "system_status": "/health/system"
    }


# Error handlers
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


# Run with uvicorn
if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🚀 Starting server on {settings.host}:{settings.port}")
    
    try:
        uvicorn.run(
            app,
            host=settings.host,
            port=settings.port,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("⏹️  Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Server error: {e}", exc_info=True)