"""
Sync models for offline-first architecture
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class SyncStatus(str, Enum):
    """Sync status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class SyncAction(str, Enum):
    """Sync actions"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class SyncItem(BaseModel):
    """Individual sync item"""
    id: Optional[int] = None
    entity_type: str  # "project", "workspace", "user", etc.
    entity_id: str
    action: SyncAction
    payload: Dict[str, Any]
    status: SyncStatus = SyncStatus.PENDING
    error_message: Optional[str] = None
    created_at: datetime
    synced_at: Optional[datetime] = None
    retry_count: int = 0


class SyncQueue(BaseModel):
    """Sync queue summary"""
    total_pending: int
    total_failed: int
    last_sync_at: Optional[datetime] = None
    next_sync_at: Optional[datetime] = None
    is_online: bool = False
    grace_period_expires_at: Optional[datetime] = None