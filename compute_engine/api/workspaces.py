"""
Workspace Management API
Handles local workspace state and sync
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


class WorkspaceState(BaseModel):
    workspace_id: str
    name: str
    workspace_type: str
    visibility: str
    owner_id: str
    sync_version: int
    member_count: int
    project_count: int
    last_synced: str
    data: Dict[str, Any]


class WorkspaceListResponse(BaseModel):
    workspaces: List[WorkspaceState]
    total: int


@router.post("/sync")
async def sync_workspace_state(workspace: WorkspaceState):
    """
    Sync workspace state to local SQLite
    Called after successful sync with Django backend
    """
    try:
        with sqlite_manager.cursor() as cursor:
            cursor.execute(
                """
                INSERT OR REPLACE INTO workspace_state 
                (workspace_id, name, sync_version, last_synced, data)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    workspace.workspace_id,
                    workspace.name,
                    workspace.sync_version,
                    workspace.last_synced,
                    json.dumps(workspace.data)
                )
            )
        
        logger.info(f"Workspace state synced: {workspace.workspace_id}")
        
        return {
            "success": True,
            "workspace_id": workspace.workspace_id,
            "message": "Workspace state synced"
        }
    except Exception as e:
        logger.error(f"Failed to sync workspace state: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=WorkspaceListResponse)
async def get_local_workspaces():
    """
    Get all locally stored workspaces
    Used when offline or for initial load
    """
    try:
        rows = sqlite_manager.execute(
            "SELECT * FROM workspace_state ORDER BY last_synced DESC"
        )
        
        workspaces = []
        for row in rows:
            data = json.loads(row['data']) if row['data'] else {}
            workspaces.append(WorkspaceState(
                workspace_id=row['workspace_id'],
                name=row['name'],
                workspace_type=data.get('workspace_type', 'team'),
                visibility=data.get('visibility', 'private'),
                owner_id=data.get('owner_id', ''),
                sync_version=row['sync_version'],
                member_count=data.get('member_count', 0),
                project_count=data.get('project_count', 0),
                last_synced=row['last_synced'],
                data=data
            ))
        
        return WorkspaceListResponse(
            workspaces=workspaces,
            total=len(workspaces)
        )
    except Exception as e:
        logger.error(f"Failed to get workspaces: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{workspace_id}")
async def get_workspace_state(workspace_id: str):
    """
    Get specific workspace state
    """
    try:
        rows = sqlite_manager.execute(
            "SELECT * FROM workspace_state WHERE workspace_id = ?",
            (workspace_id,)
        )
        
        if not rows:
            raise HTTPException(status_code=404, detail="Workspace not found in local state")
        
        row = rows[0]
        data = json.loads(row['data']) if row['data'] else {}
        
        return {
            "workspace_id": row['workspace_id'],
            "name": row['name'],
            "sync_version": row['sync_version'],
            "last_synced": row['last_synced'],
            **data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workspace: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{workspace_id}")
async def delete_workspace_state(workspace_id: str):
    """
    Delete workspace from local state
    Called when user leaves workspace or workspace is deleted
    """
    try:
        with sqlite_manager.cursor() as cursor:
            cursor.execute(
                "DELETE FROM workspace_state WHERE workspace_id = ?",
                (workspace_id,)
            )
        
        logger.info(f"Workspace state deleted: {workspace_id}")
        
        return {"success": True, "message": "Workspace state deleted"}
    except Exception as e:
        logger.error(f"Failed to delete workspace: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{workspace_id}/update-sync-version")
async def update_sync_version(workspace_id: str, sync_version: int):
    """
    Update workspace sync version
    Called after successful operation
    """
    try:
        with sqlite_manager.cursor() as cursor:
            cursor.execute(
                """
                UPDATE workspace_state 
                SET sync_version = ?, last_synced = CURRENT_TIMESTAMP
                WHERE workspace_id = ?
                """,
                (sync_version, workspace_id)
            )
        
        return {"success": True, "new_sync_version": sync_version}
    except Exception as e:
        logger.error(f"Failed to update sync version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))