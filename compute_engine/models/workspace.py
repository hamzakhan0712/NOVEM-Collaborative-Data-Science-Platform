"""
Workspace models for local compute engine
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class WorkspaceRole(str, Enum):
    """Workspace member roles"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class WorkspaceMember(BaseModel):
    """Workspace member model"""
    id: int
    user_id: int
    username: str
    email: str
    role: WorkspaceRole
    joined_at: datetime


class Workspace(BaseModel):
    """Workspace model"""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    owner_id: int
    is_active: bool = True
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_synced_at: Optional[datetime] = None
    members: List[WorkspaceMember] = []


class WorkspaceCreate(BaseModel):
    """Workspace creation model"""
    name: str
    description: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    """Workspace update model"""
    name: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None