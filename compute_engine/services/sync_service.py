"""
Sync service - handles offline queue and background syncing
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio

from core.database import get_sqlite
from core.config import settings
from models.sync import SyncItem, SyncQueue, SyncStatus
from services.backend_client import backend_client

logger = logging.getLogger(__name__)


class SyncService:
    """Service for managing offline sync queue"""
    
    def __init__(self):
        self.db = get_sqlite()
        self.is_syncing = False
        self.last_sync: Optional[datetime] = None
    
    async def get_sync_status(self) -> SyncQueue:
        """Get current sync queue status"""
        try:
            # Count pending items
            pending_row = self.db.fetch_one(
                "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'"
            )
            total_pending = pending_row['count'] if pending_row else 0
            
            # Count failed items
            failed_row = self.db.fetch_one(
                "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'"
            )
            total_failed = failed_row['count'] if failed_row else 0
            
            # Check if online
            is_online = await backend_client.check_health()
            
            # Calculate grace period expiration
            grace_period_expires_at = None
            if self.last_sync:
                grace_period_expires_at = self.last_sync + timedelta(days=settings.offline_grace_period_days)
            
            # Calculate next sync time
            next_sync_at = None
            if is_online and not self.is_syncing:
                next_sync_at = datetime.now() + timedelta(seconds=settings.sync_interval_seconds)
            
            return SyncQueue(
                total_pending=total_pending,
                total_failed=total_failed,
                last_sync_at=self.last_sync,
                next_sync_at=next_sync_at,
                is_online=is_online,
                grace_period_expires_at=grace_period_expires_at
            )
        except Exception as e:
            logger.error(f"Failed to get sync status: {e}")
            raise
    
    async def get_pending_items(self, limit: int = 100) -> List[SyncItem]:
        """Get pending sync items"""
        try:
            rows = self.db.fetch_all(
                """
                SELECT * FROM sync_queue 
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (limit,)
            )
            
            return [SyncItem(**dict(row)) for row in rows]
        except Exception as e:
            logger.error(f"Failed to get pending items: {e}")
            raise
    
    async def sync_now(self) -> Dict[str, Any]:
        """Manually trigger sync"""
        if self.is_syncing:
            return {"status": "already_syncing", "message": "Sync already in progress"}
        
        try:
            self.is_syncing = True
            logger.info("Starting manual sync...")
            
            # Check backend availability
            is_online = await backend_client.check_health()
            if not is_online:
                return {
                    "status": "offline",
                    "message": "Backend is not reachable",
                    "synced": 0,
                    "failed": 0
                }
            
            # Process sync queue
            pending_items = await self.get_pending_items()
            synced_count = 0
            failed_count = 0
            
            for item in pending_items:
                try:
                    await self._process_sync_item(item)
                    synced_count += 1
                    
                    # Mark as completed
                    self.db.execute(
                        """
                        UPDATE sync_queue 
                        SET status = 'completed', synced_at = ?
                        WHERE id = ?
                        """,
                        (datetime.now(), item.id)
                    )
                    
                except Exception as e:
                    logger.error(f"Failed to sync item {item.id}: {e}")
                    failed_count += 1
                    
                    # Mark as failed
                    self.db.execute(
                        """
                        UPDATE sync_queue 
                        SET status = 'failed', error_message = ?, retry_count = retry_count + 1
                        WHERE id = ?
                        """,
                        (str(e), item.id)
                    )
            
            self.last_sync = datetime.now()
            
            logger.info(f"Sync completed: {synced_count} synced, {failed_count} failed")
            
            return {
                "status": "completed",
                "synced": synced_count,
                "failed": failed_count,
                "timestamp": self.last_sync
            }
            
        finally:
            self.is_syncing = False
    
    async def _process_sync_item(self, item: SyncItem):
        """Process a single sync item"""
        import json
        payload = json.loads(item.payload) if isinstance(item.payload, str) else item.payload
        
        if item.entity_type == 'workspace':
            if item.action == 'create':
                await backend_client.create_workspace(payload)
            elif item.action == 'update':
                # Implement update logic
                pass
            elif item.action == 'delete':
                # Implement delete logic
                pass
        
        elif item.entity_type == 'project':
            if item.action == 'create':
                workspace_id = payload.get('workspace_id')
                await backend_client.create_project(workspace_id, payload)
            elif item.action == 'update':
                # Implement update logic
                pass
            elif item.action == 'delete':
                # Implement delete logic
                pass
    
    async def start_background_sync(self):
        """Start background sync loop"""
        logger.info("Starting background sync service...")
        
        while True:
            try:
                await asyncio.sleep(settings.sync_interval_seconds)
                
                if not self.is_syncing:
                    logger.debug("Running scheduled sync...")
                    await self.sync_now()
                
            except Exception as e:
                logger.error(f"Background sync error: {e}")
                await asyncio.sleep(60)  # Wait before retrying


# Global sync service instance
sync_service = SyncService()