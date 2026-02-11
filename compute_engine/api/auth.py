"""
Authentication & Session Management
Handles local auth state and token validation
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging
import json
from datetime import datetime

from core.database import sqlite_manager

router = APIRouter()
logger = logging.getLogger(__name__)


class SessionData(BaseModel):
    user_id: str
    email: str
    username: str
    access_token: str
    refresh_token: str
    account_state: str
    last_sync: Optional[str] = None


class SessionResponse(BaseModel):
    session_active: bool
    user_id: Optional[str] = None
    email: Optional[str] = None
    offline_mode: bool = False


@router.post("/session/store")
async def store_session(session: SessionData):
    """
    Store user session locally after successful Django login
    Called by frontend after successful authentication
    """
    try:
        # Store in SQLite preferences
        user_data = {
            "user_id": session.user_id,
            "email": session.email,
            "username": session.username,
            "account_state": session.account_state,
            "last_sync": session.last_sync or datetime.now().isoformat()
        }
        
        sqlite_manager.set_preference("current_user", json.dumps(user_data))
        sqlite_manager.set_preference("access_token", session.access_token)
        sqlite_manager.set_preference("refresh_token", session.refresh_token)
        sqlite_manager.set_preference("session_active", "true")
        
        logger.info(f"Session stored for user: {session.email}")
        
        return {
            "success": True,
            "message": "Session stored locally"
        }
    except Exception as e:
        logger.error(f"Failed to store session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/current", response_model=SessionResponse)
async def get_current_session():
    """
    Get current session status
    Used by frontend to check if user is logged in
    """
    try:
        session_active = sqlite_manager.get_preference("session_active", "false") == "true"
        
        if not session_active:
            return SessionResponse(
                session_active=False,
                offline_mode=False
            )
        
        user_data_str = sqlite_manager.get_preference("current_user")
        if not user_data_str:
            return SessionResponse(session_active=False, offline_mode=False)
        
        user_data = json.loads(user_data_str)
        
        # Check if offline mode (based on last sync)
        last_sync_str = user_data.get("last_sync")
        offline_mode = False
        if last_sync_str:
            last_sync = datetime.fromisoformat(last_sync_str)
            hours_since_sync = (datetime.now() - last_sync).total_seconds() / 3600
            offline_mode = hours_since_sync > 24  # Consider offline if no sync for 24h
        
        return SessionResponse(
            session_active=True,
            user_id=user_data.get("user_id"),
            email=user_data.get("email"),
            offline_mode=offline_mode
        )
    except Exception as e:
        logger.error(f"Failed to get session: {e}", exc_info=True)
        return SessionResponse(session_active=False, offline_mode=False)


@router.post("/session/clear")
async def clear_session():
    """
    Clear local session
    Called on logout
    """
    try:
        sqlite_manager.set_preference("session_active", "false")
        sqlite_manager.set_preference("current_user", "")
        sqlite_manager.set_preference("access_token", "")
        sqlite_manager.set_preference("refresh_token", "")
        
        logger.info("Session cleared")
        
        return {"success": True, "message": "Session cleared"}
    except Exception as e:
        logger.error(f"Failed to clear session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/token")
async def get_access_token():
    """
    Get current access token
    Used by frontend to make authenticated requests to Django
    """
    try:
        token = sqlite_manager.get_preference("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="No active session")
        
        return {"access_token": token}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get token: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))