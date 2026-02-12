"""
Backend API client for syncing metadata
"""
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from core.config import settings

logger = logging.getLogger(__name__)


class BackendClient:
    """Client for communicating with Django backend"""
    
    def __init__(self):
        self.base_url = settings.backend_api_url
        self.timeout = settings.backend_timeout
        self.token: Optional[str] = None
    
    def set_token(self, token: str):
        """Set authentication token"""
        self.token = token
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with auth token"""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    async def check_health(self) -> bool:
        """Check if backend is reachable"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/health/")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Backend health check failed: {e}")
            return False
    
    async def sync_workspaces(self) -> Dict[str, Any]:
        """Sync workspace metadata from backend"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/workspaces/",
                    headers=self._get_headers()
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to sync workspaces: {e}")
            raise
    
    async def sync_projects(self, workspace_id: int) -> Dict[str, Any]:
        """Sync project metadata from backend"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/workspaces/{workspace_id}/projects/",
                    headers=self._get_headers()
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to sync projects: {e}")
            raise
    
    async def create_workspace(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create workspace on backend"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/workspaces/",
                    json=data,
                    headers=self._get_headers()
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to create workspace: {e}")
            raise
    
    async def create_project(self, workspace_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create project on backend"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/workspaces/{workspace_id}/projects/",
                    json=data,
                    headers=self._get_headers()
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to create project: {e}")
            raise


# Global backend client instance
backend_client = BackendClient()