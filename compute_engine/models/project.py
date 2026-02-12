"""
Project models for local compute engine
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProjectRole(str, Enum):
    """Project member roles"""
    LEAD = "lead"
    CONTRIBUTOR = "contributor"
    ANALYST = "analyst"
    VIEWER = "viewer"


class ProjectVisibility(str, Enum):
    """Project visibility levels"""
    PRIVATE = "private"
    WORKSPACE = "workspace"
    PUBLIC = "public"


class ProjectMember(BaseModel):
    """Project member model"""
    id: int
    user_id: int
    username: str
    email: str
    role: ProjectRole
    joined_at: datetime


class Project(BaseModel):
    """Project model"""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    workspace_id: int
    owner_id: int
    visibility: ProjectVisibility = ProjectVisibility.WORKSPACE
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    last_synced_at: Optional[datetime] = None
    members: List[ProjectMember] = []


class ProjectCreate(BaseModel):
    """Project creation model"""
    name: str
    description: Optional[str] = None
    workspace_id: int
    visibility: ProjectVisibility = ProjectVisibility.WORKSPACE


class ProjectUpdate(BaseModel):
    """Project update model"""
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[ProjectVisibility] = None