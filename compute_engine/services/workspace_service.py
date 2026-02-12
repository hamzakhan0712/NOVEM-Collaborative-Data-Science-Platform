"""
Workspace service - manages local workspace state and syncing
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from core.database import get_sqlite
from models.workspace import Workspace, WorkspaceCreate, WorkspaceUpdate, WorkspaceMember
from services.backend_client import backend_client

logger = logging.getLogger(__name__)


class WorkspaceService:
    """Service for managing workspaces locally"""
    
    def __init__(self):
        self.db = get_sqlite()
    
    async def get_all_workspaces(self, user_id: int) -> List[Workspace]:
        """Get all workspaces for a user from local storage"""
        try:
            rows = self.db.fetch_all(
                """
                SELECT w.*, wm.role, wm.joined_at
                FROM workspaces w
                JOIN workspace_members wm ON w.id = wm.workspace_id
                WHERE wm.user_id = ?
                ORDER BY w.updated_at DESC
                """,
                (user_id,)
            )
            
            workspaces = []
            for row in rows:
                workspace_data = dict(row)
                # Fetch members
                members = await self._get_workspace_members(workspace_data['id'])
                workspace_data['members'] = members
                workspaces.append(Workspace(**workspace_data))
            
            return workspaces
        except Exception as e:
            logger.error(f"Failed to get workspaces: {e}")
            raise
    
    async def get_workspace(self, workspace_id: int, user_id: int) -> Optional[Workspace]:
        """Get a specific workspace"""
        try:
            row = self.db.fetch_one(
                """
                SELECT w.*, wm.role, wm.joined_at
                FROM workspaces w
                JOIN workspace_members wm ON w.id = wm.workspace_id
                WHERE w.id = ? AND wm.user_id = ?
                """,
                (workspace_id, user_id)
            )
            
            if not row:
                return None
            
            workspace_data = dict(row)
            workspace_data['members'] = await self._get_workspace_members(workspace_id)
            
            return Workspace(**workspace_data)
        except Exception as e:
            logger.error(f"Failed to get workspace {workspace_id}: {e}")
            raise
    
    async def create_workspace(self, data: WorkspaceCreate, user_id: int, sync: bool = True) -> Workspace:
        """Create a new workspace"""
        try:
            now = datetime.now()
            
            # Insert workspace
            cursor = self.db.execute(
                """
                INSERT INTO workspaces (name, slug, description, owner_id, created_at, updated_at, is_synced)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data.name,
                    data.name.lower().replace(' ', '-'),
                    data.description,
                    user_id,
                    now,
                    now,
                    0  # Not synced yet
                )
            )
            
            workspace_id = cursor.lastrowid
            
            # Add creator as owner
            self.db.execute(
                """
                INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
                VALUES (?, ?, 'owner', ?)
                """,
                (workspace_id, user_id, now)
            )
            
            # Queue for sync if online
            if sync:
                await self._queue_for_sync(workspace_id, 'create', data.dict())
            
            # Fetch and return created workspace
            return await self.get_workspace(workspace_id, user_id)
        
        except Exception as e:
            logger.error(f"Failed to create workspace: {e}")
            raise
    
    async def update_workspace(
        self, 
        workspace_id: int, 
        data: WorkspaceUpdate, 
        user_id: int,
        sync: bool = True
    ) -> Workspace:
        """Update a workspace"""
        try:
            update_fields = []
            params = []
            
            if data.name is not None:
                update_fields.append("name = ?")
                params.append(data.name)
                update_fields.append("slug = ?")
                params.append(data.name.lower().replace(' ', '-'))
            
            if data.description is not None:
                update_fields.append("description = ?")
                params.append(data.description)
            
            if data.avatar is not None:
                update_fields.append("avatar = ?")
                params.append(data.avatar)
            
            if not update_fields:
                return await self.get_workspace(workspace_id, user_id)
            
            update_fields.append("updated_at = ?")
            params.append(datetime.now())
            update_fields.append("is_synced = 0")
            
            params.append(workspace_id)
            
            self.db.execute(
                f"""
                UPDATE workspaces 
                SET {', '.join(update_fields)}
                WHERE id = ?
                """,
                tuple(params)
            )
            
            # Queue for sync
            if sync:
                await self._queue_for_sync(workspace_id, 'update', data.dict(exclude_unset=True))
            
            return await self.get_workspace(workspace_id, user_id)
        
        except Exception as e:
            logger.error(f"Failed to update workspace {workspace_id}: {e}")
            raise
    
    async def delete_workspace(self, workspace_id: int, sync: bool = True):
        """Delete a workspace (soft delete)"""
        try:
            self.db.execute(
                """
                UPDATE workspaces 
                SET is_active = 0, updated_at = ?, is_synced = 0
                WHERE id = ?
                """,
                (datetime.now(), workspace_id)
            )
            
            if sync:
                await self._queue_for_sync(workspace_id, 'delete', {})
            
        except Exception as e:
            logger.error(f"Failed to delete workspace {workspace_id}: {e}")
            raise
    
    async def sync_from_backend(self, user_id: int):
        """Sync workspaces from Django backend"""
        try:
            # Fetch workspaces from backend
            backend_workspaces = await backend_client.sync_workspaces()
            
            now = datetime.now()
            
            for ws_data in backend_workspaces.get('results', []):
                # Check if workspace exists locally
                existing = self.db.fetch_one(
                    "SELECT id FROM workspaces WHERE id = ?",
                    (ws_data['id'],)
                )
                
                if existing:
                    # Update existing workspace
                    self.db.execute(
                        """
                        UPDATE workspaces 
                        SET name = ?, slug = ?, description = ?, avatar = ?,
                            updated_at = ?, last_synced_at = ?, is_synced = 1
                        WHERE id = ?
                        """,
                        (
                            ws_data['name'],
                            ws_data['slug'],
                            ws_data.get('description'),
                            ws_data.get('avatar'),
                            ws_data['updated_at'],
                            now,
                            ws_data['id']
                        )
                    )
                else:
                    # Insert new workspace
                    self.db.execute(
                        """
                        INSERT INTO workspaces 
                        (id, name, slug, description, owner_id, avatar, created_at, updated_at, last_synced_at, is_synced)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                        """,
                        (
                            ws_data['id'],
                            ws_data['name'],
                            ws_data['slug'],
                            ws_data.get('description'),
                            ws_data['owner']['id'],
                            ws_data.get('avatar'),
                            ws_data['created_at'],
                            ws_data['updated_at'],
                            now
                        )
                    )
                    
                    # Add user as member
                    self.db.execute(
                        """
                        INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role, joined_at)
                        VALUES (?, ?, ?, ?)
                        """,
                        (ws_data['id'], user_id, 'member', now)
                    )
            
            logger.info(f"Synced {len(backend_workspaces.get('results', []))} workspaces from backend")
            
        except Exception as e:
            logger.error(f"Failed to sync workspaces from backend: {e}")
            raise
    
    async def _get_workspace_members(self, workspace_id: int) -> List[WorkspaceMember]:
        """Get members of a workspace"""
        try:
            rows = self.db.fetch_all(
                """
                SELECT wm.*, u.username, u.email
                FROM workspace_members wm
                JOIN users u ON wm.user_id = u.id
                WHERE wm.workspace_id = ?
                """,
                (workspace_id,)
            )
            
            return [WorkspaceMember(**dict(row)) for row in rows]
        except Exception as e:
            logger.warning(f"Failed to get workspace members: {e}")
            return []
    
    async def _queue_for_sync(self, workspace_id: int, action: str, payload: Dict[str, Any]):
        """Queue workspace change for syncing to backend"""
        try:
            self.db.execute(
                """
                INSERT INTO sync_queue (entity_type, entity_id, action, payload, created_at, status)
                VALUES ('workspace', ?, ?, ?, ?, 'pending')
                """,
                (str(workspace_id), action, str(payload), datetime.now())
            )
            logger.debug(f"Queued workspace {workspace_id} for sync: {action}")
        except Exception as e:
            logger.error(f"Failed to queue workspace for sync: {e}")


# Global workspace service instance
workspace_service = WorkspaceService()