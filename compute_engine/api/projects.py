"""
Project Management API
Handles local project state and metadata
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import json
from datetime import datetime

from core.database import sqlite_manager

router = APIRouter()
logger = logging.getLogger(__name__)


class ProjectState(BaseModel):
    project_id: str
    workspace_id: str
    name: str
    visibility: str
    creator_id: str
    sync_version: int
    member_count: int
    last_synced: str
    data: Dict[str, Any]


class ProjectListResponse(BaseModel):
    projects: List[ProjectState]
    total: int


@router.post("/sync")
async def sync_project_state(project: ProjectState):
    """
    Sync project state to local SQLite
    Called after successful sync with Django backend
    """
    try:
        with sqlite_manager.cursor() as cursor:
            cursor.execute(
                """
                INSERT OR REPLACE INTO project_state 
                (project_id, workspace_id, name, sync_version, last_synced, data)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    project.project_id,
                    project.workspace_id,
                    project.name,
                    project.sync_version,
                    project.last_synced,
                    json.dumps(project.data)
                )
            )
        
        logger.info(f"Project state synced: {project.project_id}")
        
        return {
            "success": True,
            "project_id": project.project_id,
            "message": "Project state synced"
        }
    except Exception as e:
        logger.error(f"Failed to sync project state: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=ProjectListResponse)
async def get_local_projects(workspace_id: Optional[str] = None):
    """
    Get all locally stored projects
    Optional filter by workspace_id
    """
    try:
        if workspace_id:
            rows = sqlite_manager.execute(
                "SELECT * FROM project_state WHERE workspace_id = ? ORDER BY last_synced DESC",
                (workspace_id,)
            )
        else:
            rows = sqlite_manager.execute(
                "SELECT * FROM project_state ORDER BY last_synced DESC"
            )
        
        projects = []
        for row in rows:
            data = json.loads(row['data']) if row['data'] else {}
            projects.append(ProjectState(
                project_id=row['project_id'],
                workspace_id=row['workspace_id'],
                name=row['name'],
                visibility=data.get('visibility', 'private'),
                creator_id=data.get('creator_id', ''),
                sync_version=row['sync_version'],
                member_count=data.get('member_count', 0),
                last_synced=row['last_synced'],
                data=data
            ))
        
        return ProjectListResponse(
            projects=projects,
            total=len(projects)
        )
    except Exception as e:
        logger.error(f"Failed to get projects: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}")
async def get_project_state(project_id: str):
    """
    Get specific project state
    """
    try:
        rows = sqlite_manager.execute(
            "SELECT * FROM project_state WHERE project_id = ?",
            (project_id,)
        )
        
        if not rows:
            raise HTTPException(status_code=404, detail="Project not found in local state")
        
        row = rows[0]
        data = json.loads(row['data']) if row['data'] else {}
        
        return {
            "project_id": row['project_id'],
            "workspace_id": row['workspace_id'],
            "name": row['name'],
            "sync_version": row['sync_version'],
            "last_synced": row['last_synced'],
            **data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
async def delete_project_state(project_id: str):
    """
    Delete project from local state
    Called when user leaves project or project is deleted
    """
    try:
        with sqlite_manager.cursor() as cursor:
            cursor.execute(
                "DELETE FROM project_state WHERE project_id = ?",
                (project_id,)
            )
            
            # Also delete related datasets
            cursor.execute(
                "DELETE FROM dataset_registry WHERE project_id = ?",
                (project_id,)
            )
            
            # Delete analysis history
            cursor.execute(
                "DELETE FROM analysis_history WHERE project_id = ?",
                (project_id,)
            )
        
        logger.info(f"Project state and related data deleted: {project_id}")
        
        return {"success": True, "message": "Project state deleted"}
    except Exception as e:
        logger.error(f"Failed to delete project: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/update-sync-version")
async def update_project_sync_version(project_id: str, sync_version: int):
    """
    Update project sync version
    Called after successful operation
    """
    try:
        with sqlite_manager.cursor() as cursor:
            cursor.execute(
                """
                UPDATE project_state 
                SET sync_version = ?, last_synced = CURRENT_TIMESTAMP
                WHERE project_id = ?
                """,
                (sync_version, project_id)
            )
        
        return {"success": True, "new_sync_version": sync_version}
    except Exception as e:
        logger.error(f"Failed to update sync version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/statistics")
async def get_project_statistics(project_id: str):
    """
    Get project statistics
    Returns dataset count, analysis count, etc.
    """
    try:
        # Count datasets
        dataset_rows = sqlite_manager.execute(
            "SELECT COUNT(*) as count FROM dataset_registry WHERE project_id = ?",
            (project_id,)
        )
        dataset_count = dataset_rows[0]['count'] if dataset_rows else 0
        
        # Count analyses
        analysis_rows = sqlite_manager.execute(
            "SELECT COUNT(*) as count FROM analysis_history WHERE project_id = ?",
            (project_id,)
        )
        analysis_count = analysis_rows[0]['count'] if analysis_rows else 0
        
        # Get total data size
        size_rows = sqlite_manager.execute(
            "SELECT SUM(size_bytes) as total_size FROM dataset_registry WHERE project_id = ?",
            (project_id,)
        )
        total_size_bytes = size_rows[0]['total_size'] if size_rows and size_rows[0]['total_size'] else 0
        
        return {
            "project_id": project_id,
            "dataset_count": dataset_count,
            "analysis_count": analysis_count,
            "total_size_mb": round(total_size_bytes / (1024 * 1024), 2),
            "storage_usage": {
                "datasets": dataset_count,
                "analyses": analysis_count
            }
        }
    except Exception as e:
        logger.error(f"Failed to get project statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))