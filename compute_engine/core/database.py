"""
Database Management
Handles both DuckDB (analytical) and SQLite (metadata/state) connections
"""
import duckdb
import sqlite3
import logging
from pathlib import Path
from typing import Optional

from .config import settings

logger = logging.getLogger(__name__)


class DuckDBManager:
    """
    Manages DuckDB connection for analytical queries
    """
    def __init__(self):
        self.conn: Optional[duckdb.DuckDBPyConnection] = None
        self._initialized = False
        
    def _connect(self):
        """Initialize DuckDB connection"""
        if self._initialized:
            return
            
        try:
            db_path = settings.data_dir / "novem_analytical.duckdb"
            logger.info(f"Connecting to DuckDB at: {db_path}")
            
            self.conn = duckdb.connect(str(db_path))
            
            # Configure DuckDB settings
            self.conn.execute(f"SET memory_limit='{settings.max_memory_gb}GB'")
            self.conn.execute(f"SET threads={settings.max_cpu_cores}")
            
            # Enable useful extensions
            try:
                self.conn.execute("INSTALL httpfs; LOAD httpfs;")
                self.conn.execute("INSTALL parquet; LOAD parquet;")
            except Exception as e:
                logger.warning(f"Could not load DuckDB extensions: {e}")
            
            self._initialized = True
            logger.info("✅ DuckDB connected successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to DuckDB: {e}", exc_info=True)
            raise
    
    def get_connection(self) -> duckdb.DuckDBPyConnection:
        """Get or create DuckDB connection"""
        if not self._initialized or self.conn is None:
            self._connect()
        return self.conn
    
    def execute(self, query: str, params: Optional[tuple] = None):
        """Execute a DuckDB query"""
        conn = self.get_connection()
        if params:
            return conn.execute(query, params)
        return conn.execute(query)
    
    def close(self):
        """Close DuckDB connection"""
        if self.conn:
            try:
                self.conn.close()
                logger.info("DuckDB connection closed")
            except Exception as e:
                logger.error(f"Error closing DuckDB: {e}")
            finally:
                self.conn = None
                self._initialized = False


class SQLiteManager:
    """
    Manages SQLite connection for metadata and state
    """
    def __init__(self):
        self.conn: Optional[sqlite3.Connection] = None
        self._initialized = False
    
    def _connect(self):
        """Initialize SQLite connection"""
        if self._initialized:
            return
            
        try:
            db_path = settings.data_dir / "novem_metadata.db"
            logger.info(f"Connecting to SQLite at: {db_path}")
            
            self.conn = sqlite3.connect(str(db_path), check_same_thread=False)
            self.conn.row_factory = sqlite3.Row  # Enable dict-like access
            
            # Create necessary tables
            self._create_tables()
            
            self._initialized = True
            logger.info("✅ SQLite connected successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to SQLite: {e}", exc_info=True)
            raise
    
    def _create_tables(self):
        """Create SQLite tables for metadata"""
        cursor = self.conn.cursor()
        
        # Session state table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_state (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Sync queue table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation TEXT NOT NULL,
                payload TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Cache table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                value TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.conn.commit()
        logger.info("SQLite tables initialized")
    
    def get_connection(self) -> sqlite3.Connection:
        """Get or create SQLite connection"""
        if not self._initialized or self.conn is None:
            self._connect()
        return self.conn
    
    def execute(self, query: str, params: Optional[tuple] = None):
        """Execute a SQLite query"""
        conn = self.get_connection()
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        conn.commit()
        return cursor
    
    def close(self):
        """Close SQLite connection"""
        if self.conn:
            try:
                self.conn.close()
                logger.info("SQLite connection closed")
            except Exception as e:
                logger.error(f"Error closing SQLite: {e}")
            finally:
                self.conn = None
                self._initialized = False


# Global instances
duckdb_manager = DuckDBManager()
sqlite_manager = SQLiteManager()