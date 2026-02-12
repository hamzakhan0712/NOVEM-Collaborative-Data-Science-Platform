"""
Project service - manages local project state and syncing
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from core.database import get_sqlite
from models.project import Project, ProjectCreate, ProjectUpdate, ProjectMember
from services.backend_client import backend_client

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for managing projects locally"""
    
    def __init__(self):
        self.db = get_sqlite()
    
    async def get_workspace_projects(self, workspace_id: int, user_id: int) -> List[Project]:
        """Get all projects in a workspace"""
        try:
            rows = self.db.fetch_all(
                """
                SELECT p.*, pm.role, pm.joined_at
                FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                WHERE p.workspace_id = ? AND pm.user_id = ?
                ORDER BY p.updated_at DESC
                """,
                (workspace_id, user_id)
            )
            
            projects = []
            for row in rows:
                project_data = dict(row)
                project_data['members'] = await self._get_project_members(project_data['id'])
                projects.append(Project(**project_data))
            
            return projects
        except Exception as e:
            logger.error(f"Failed to get workspace projects: {e}")
            raise
    
    async def get_project(self, project_id: int, user_id: int) -> Optional[Project]:
        """Get a specific project"""
        try:
            row = self.db.fetch_one(
                """
                SELECT p.*, pm.role, pm.joined_at
                FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                WHERE p.id = ? AND pm.user_id = ?
                """,
                (project_id, user_id)
            )
            
            if not row:
                return None
            
            project_data = dict(row)
            project_data['members'] = await self._get_project_members(project_id)
            
            return Project(**project_data)
        except Exception as e:
            logger.error(f"Failed to get project {project_id}: {e}")
            raise
    
    async def create_project(
        self, 
        data: ProjectCreate, 
        user_id: int,
        sync: bool = True
    ) -> Project:
        """Create a new project"""
        try:
            now = datetime.now()
            
            # Insert project
            cursor = self.db.execute(
                """
                INSERT INTO projects 
                (name, slug, description, workspace_id, owner_id, visibility, created_at, updated_at, is_synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data.name,
                    data.name.lower().replace(' ', '-'),
                    data.description,
                    data.workspace_id,
                    user_id,
                    data.visibility.value,
                    now,
                    now,
                    0  # Not synced yet
                )
            )
            
            project_id = cursor.lastrowid
            
            # Add creator as lead
            self.db.execute(
                """
                INSERT INTO project_members (project_id, user_id, role, joined_at)
                VALUES (?, ?, 'lead', ?)
                """,
                (project_id, user_id, now)
            )
            
            # Queue for sync
            if sync:
                await self._queue_for_sync(project_id, 'create', data.dict())
            
            return await self.get_project(project_id, user_id)
        
        except Exception as e:
            logger.error(f"Failed to create project: {e}")
            raise
    
    async def update_project(
        self,
        project_id: int,
        data: ProjectUpdate,
        user_id: int,
        sync: bool = True
    ) -> Project:
        """Update a project"""
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
            
            if data.visibility is not None:
                update_fields.append("visibility = ?")
                params.append(data.visibility.value)
            
            if not update_fields:
                return await self.get_project(project_id, user_id)
            
            update_fields.append("updated_at = ?")
            params.append(datetime.now())
            update_fields.append("is_synced = 0")
            
            params.append(project_id)
            
            self.db.execute(
                f"""
                UPDATE projects 
                SET {', '.join(update_fields)}
                WHERE id = ?
                """,
                tuple(params)
            )
            
            if sync:
                await self._queue_for_sync(project_id, 'update', data.dict(exclude_unset=True))
            
            return await self.get_project(project_id, user_id)
        
        except Exception as e:
            logger.error(f"Failed to update project {project_id}: {e}")
            raise
    
    async def delete_project(self, project_id: int, sync: bool = True):
        """Delete a project (soft delete)"""
        try:
            self.db.execute(
                """
                UPDATE projects 
                SET is_active = 0, updated_at = ?, is_synced = 0
                WHERE id = ?
                """,
                (datetime.now(), project_id)
            )
            
            if sync:
                await self._queue_for_sync(project_id, 'delete', {})
            
        except Exception as e:
            logger.error(f"Failed to delete project {project_id}: {e}")
            raise
    
    async def sync_from_backend(self, workspace_id: int, user_id: int):
        """Sync projects from Django backend"""
        try:
            backend_projects = await backend_client.sync_projects(workspace_id)
            
            now = datetime.now()
            
            for proj_data in backend_projects.get('results', []):
                existing = self.db.fetch_one(
                    "SELECT id FROM projects WHERE id = ?",
                    (proj_data['id'],)
                )
                
                if existing:
                    # Update existing
                    self.db.execute(
                        """
                        UPDATE projects 
                        SET name = ?, slug = ?, description = ?, visibility = ?,
                            updated_at = ?, last_synced_at = ?, is_synced = 1
                        WHERE id = ?
                        """,
                        (
                            proj_data['name'],
                            proj_data['slug'],
                            proj_data.get('description'),
                            proj_data['visibility'],
                            proj_data['updated_at'],
                            now,
                            proj_data['id']
                        )
                    )
                else:
                    # Insert new
                    self.db.execute(
                        """
                        INSERT INTO projects 
                        (id, name, slug, description, workspace_id, owner_id, visibility,
                         created_at, updated_at, last_synced_at, is_synced)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                        """,
                        (
                            proj_data['id'],
                            proj_data['name'],
                            proj_data['slug'],
                            proj_data.get('description'),
                            workspace_id,
                            proj_data['owner']['id'],
                            proj_data['visibility'],
                            proj_data['created_at'],
                            proj_data['updated_at'],
                            now
                        )
                    )
                    
                    # Add user as member
                    self.db.execute(
                        """
                        INSERT OR IGNORE INTO project_members (project_id, user_id, role, joined_at)
                        VALUES (?, ?, ?, ?)
                        """,
                        (proj_data['id'], user_id, 'viewer', now)
                    )
            
            logger.info(f"Synced {len(backend_projects.get('results', []))} projects from backend")
            
        except Exception as e:
            logger.error(f"Failed to sync projects from backend: {e}")
            raise
    
    async def _get_project_members(self, project_id: int) -> List[ProjectMember]:
        """Get project members"""
        try:
            rows = self.db.fetch_all(
                """
                SELECT pm.*, u.username, u.email
                FROM project_members pm
                JOIN users u ON pm.user_id = u.id
                WHERE pm.project_id = ?
                """,
                (project_id,)
            )
            
            return [ProjectMember(**dict(row)) for row in rows]
        except Exception as e:
            logger.warning(f"Failed to get project members: {e}")
            return []
    
    async def _queue_for_sync(self, project_id: int, action: str, payload: Dict[str, Any]):
        """Queue project change for sync"""
        try:
            self.db.execute(
                """
                INSERT INTO sync_queue (entity_type, entity_id, action, payload, created_at, status)
                VALUES ('project', ?, ?, ?, ?, 'pending')
                """,
                (str(project_id), action, str(payload), datetime.now())
            )
            logger.debug(f"Queued project {project_id} for sync: {action}")
        except Exception as e:
            logger.error(f"Failed to queue project for sync: {e}")


# Global project service instance
project_service = ProjectService()