"""
API Routes Package
"""
from .health import router as health_router
from .auth import router as auth_router
from .workspaces import router as workspaces_router
from .projects import router as projects_router
from .sync import router as sync_router

__all__ = [
    'health_router',
    'auth_router',
    'workspaces_router',
    'projects_router',
    'sync_router'
]