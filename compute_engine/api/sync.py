"""
Sync Management API
Handles sync queue and offline mode
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime

from core.database import sqlite_manager

router = APIRouter()
logger = logging.getLogger(__name__)


class SyncQueueItem(BaseModel):
    id: Optional[int] = None
    entity_type: str
    entity_id: str
    operation: str
    payload: Optional[str] = None
    status: str = "pending"
    retry_count: int = 0


class SyncStatusResponse(BaseModel):
    pending_count: int
    failed_count: int
    last_sync: Optional[str]
    offline_mode: bool


@router.post("/queue/add")
async def add_to_sync_queue(item: SyncQueueItem):
    """
    Add item to sync queue
    Used when offline or operation needs to be synced later
    """
    try:
        sqlite_manager.add_to_sync_queue(
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            operation=item.operation,
            payload=item.payload
        )
        
        logger.info(f"Added to sync queue: {item.entity_type}/{item.entity_id}")
        
        return {
            "success": True,
            "message": "Item added to sync queue"
        }
    except Exception as e:
        logger.error(f"Failed to add to sync queue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/pending")
async def get_pending_sync_items(limit: int = 100):
    """
    Get pending sync items
    Used by sync service to process queue
    """
    try:
        items = sqlite_manager.get_pending_sync_items(limit)
        
        return {
            "items": [
                {
                    "id": item['id'],
                    "entity_type": item['entity_type'],
                    "entity_id": item['entity_id'],
                    "operation": item['operation'],
                    "payload": item['payload'],
                    "created_at": item['created_at'],
                    "retry_count": item['retry_count']
                }
                for item in items
            ],
            "count": len(items)
        }
    except Exception as e:
        logger.error(f"Failed to get pending sync items: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/queue/{sync_id}/complete")
async def mark_sync_complete(sync_id: int):
    """
    Mark sync item as completed
    """
    try:
        sqlite_manager.mark_synced(sync_id)
        return {"success": True, "message": "Sync item marked as completed"}
    except Exception as e:
        logger.error(f"Failed to mark sync complete: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/queue/{sync_id}/fail")
async def mark_sync_failed(sync_id: int, error_message: str):
    """
    Mark sync item as failed
    """
    try:
        sqlite_manager.mark_sync_failed(sync_id, error_message)
        return {"success": True, "message": "Sync item marked as failed"}
    except Exception as e:
        logger.error(f"Failed to mark sync failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status():
    """
    Get overall sync status
    Used by frontend to display sync state
    """
    try:
        # Count pending items
        pending = sqlite_manager.execute(
            "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'"
        )
        pending_count = pending[0]['count'] if pending else 0
        
        # Count failed items
        failed = sqlite_manager.execute(
            "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'"
        )
        failed_count = failed[0]['count'] if failed else 0
        
        # Get last sync time
        last_sync_row = sqlite_manager.execute(
            "SELECT MAX(synced_at) as last_sync FROM sync_queue WHERE status = 'completed'"
        )
        last_sync = last_sync_row[0]['last_sync'] if last_sync_row and last_sync_row[0]['last_sync'] else None
        
        # Determine offline mode
        offline_mode = False
        if last_sync:
            last_sync_dt = datetime.fromisoformat(last_sync)
            hours_since_sync = (datetime.now() - last_sync_dt).total_seconds() / 3600
            offline_mode = hours_since_sync > 24
        
        return SyncStatusResponse(
            pending_count=pending_count,
            failed_count=failed_count,
            last_sync=last_sync,
            offline_mode=offline_mode
        )
    except Exception as e:
        logger.error(f"Failed to get sync status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-queue")
async def clear_sync_queue():
    """
    Clear completed sync items
    Optional maintenance operation
    """
    try:
        with sqlite_manager.cursor() as cursor:
            cursor.execute("DELETE FROM sync_queue WHERE status = 'completed'")
        
        return {"success": True, "message": "Completed items cleared from queue"}
    except Exception as e:
        logger.error(f"Failed to clear sync queue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))