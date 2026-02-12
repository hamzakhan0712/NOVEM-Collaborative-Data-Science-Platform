"""
User models for local compute engine
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """User model"""
    id: int
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_synced_at: Optional[datetime] = None


class UserCreate(BaseModel):
    """User creation model"""
    username: str
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserUpdate(BaseModel):
    """User update model"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None