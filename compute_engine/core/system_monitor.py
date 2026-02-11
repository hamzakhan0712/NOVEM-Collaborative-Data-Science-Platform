"""
System Resource Monitor
Tracks CPU, memory, and disk usage for resource management
"""
import psutil
import threading
import time
import logging
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class SystemMonitor:
    """
    Monitors system resources and provides usage statistics
    """
    def __init__(self, update_interval: int = 5):
        self.update_interval = update_interval
        self._monitoring = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._latest_stats: Dict = {}
        self._lock = threading.Lock()
        
    def start(self):
        """Start monitoring system resources"""
        if self._monitoring:
            logger.warning("System monitor already running")
            return
            
        logger.info("Starting system resource monitor...")
        self._monitoring = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        logger.info("✅ System monitor started")
        
    def stop(self):
        """Stop monitoring system resources"""
        if not self._monitoring:
            return
            
        logger.info("Stopping system resource monitor...")
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=2)
        logger.info("✅ System monitor stopped")
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self._monitoring:
            try:
                stats = self._collect_stats()
                with self._lock:
                    self._latest_stats = stats
            except Exception as e:
                logger.error(f"Error collecting system stats: {e}")
            
            time.sleep(self.update_interval)
    
    def _collect_stats(self) -> Dict:
        """Collect current system statistics"""
        # CPU stats
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count(logical=True)
        
        # Memory stats
        memory = psutil.virtual_memory()
        memory_used_gb = (memory.total - memory.available) / (1024 ** 3)
        memory_available_gb = memory.available / (1024 ** 3)
        memory_total_gb = memory.total / (1024 ** 3)
        
        # Disk stats
        disk = psutil.disk_usage('/')
        disk_used_gb = disk.used / (1024 ** 3)
        disk_available_gb = disk.free / (1024 ** 3)
        disk_total_gb = disk.total / (1024 ** 3)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": {
                "percent": round(cpu_percent, 1),
                "count": cpu_count,
            },
            "memory": {
                "used_gb": round(memory_used_gb, 2),
                "available_gb": round(memory_available_gb, 2),
                "total_gb": round(memory_total_gb, 2),
                "percent": round(memory.percent, 1),
            },
            "disk": {
                "used_gb": round(disk_used_gb, 2),
                "available_gb": round(disk_available_gb, 2),
                "total_gb": round(disk_total_gb, 2),
                "percent": round(disk.percent, 1),
            }
        }
    
    def get_stats(self) -> Dict:
        """Get latest system statistics"""
        with self._lock:
            if not self._latest_stats:
                # If no stats yet, collect immediately
                return self._collect_stats()
            return self._latest_stats.copy()
    
    def get_cpu_usage(self) -> float:
        """Get current CPU usage percentage"""
        stats = self.get_stats()
        return stats.get("cpu", {}).get("percent", 0.0)
    
    def get_memory_usage(self) -> float:
        """Get current memory usage percentage"""
        stats = self.get_stats()
        return stats.get("memory", {}).get("percent", 0.0)
    
    def get_disk_usage(self) -> float:
        """Get current disk usage percentage"""
        stats = self.get_stats()
        return stats.get("disk", {}).get("percent", 0.0)
    
    def is_healthy(self) -> bool:
        """Check if system resources are within healthy limits"""
        stats = self.get_stats()
        
        cpu_percent = stats.get("cpu", {}).get("percent", 0)
        memory_percent = stats.get("memory", {}).get("percent", 0)
        disk_percent = stats.get("disk", {}).get("percent", 0)
        
        # Consider system healthy if resources are below critical thresholds
        return (
            cpu_percent < 90 and
            memory_percent < 90 and
            disk_percent < 95
        )
    
    def get_available_memory_gb(self) -> float:
        """Get available memory in GB"""
        stats = self.get_stats()
        return stats.get("memory", {}).get("available_gb", 0.0)
    
    def get_available_disk_gb(self) -> float:
        """Get available disk space in GB"""
        stats = self.get_stats()
        return stats.get("disk", {}).get("available_gb", 0.0)


# Global instance
system_monitor = SystemMonitor(update_interval=5)