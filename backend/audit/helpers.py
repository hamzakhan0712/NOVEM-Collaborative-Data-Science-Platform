"""
Decorators for automatic audit logging
"""
from functools import wraps
from .models import AuditLog
import logging

logger = logging.getLogger(__name__)


def audit_action(action, category, resource_type):
    """
    Decorator to automatically log actions
    
    Usage:
        @audit_action('project_created', 'project', 'project')
        def create_project(request, ...):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            # Execute the function
            result = func(request, *args, **kwargs)
            
            # Log the action
            try:
                resource_id = None
                details = {}
                
                # Try to extract resource_id from result
                if hasattr(result, 'data') and isinstance(result.data, dict):
                    resource_id = result.data.get('id')
                    details = {k: v for k, v in result.data.items() if k != 'id'}
                
                AuditLog.log_action(
                    user=request.user if hasattr(request, 'user') else None,
                    action=action,
                    category=category,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    details=details,
                    ip_address=getattr(request, 'audit_ip', None),
                    user_agent=getattr(request, 'audit_user_agent', ''),
                    success=result.status_code < 400 if hasattr(result, 'status_code') else True
                )
            except Exception as e:
                logger.error(f"Audit logging failed: {str(e)}")
            
            return result
        return wrapper
    return decorator