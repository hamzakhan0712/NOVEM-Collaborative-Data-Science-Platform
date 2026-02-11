from rest_framework import permissions


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to access it
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Check if object has owner attribute
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # Check if object has user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class IsProjectMember(permissions.BasePermission):
    """
    Permission to check if user is a project member
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Check if object has project attribute
        if hasattr(obj, 'project'):
            return obj.project.members.filter(user=request.user).exists()
        
        # If object is a project itself
        if hasattr(obj, 'members'):
            return obj.members.filter(user=request.user).exists()
        
        return False


class IsWorkspaceMember(permissions.BasePermission):
    """
    Permission to check if user is a workspace member
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Check if object has workspace attribute
        if hasattr(obj, 'workspace'):
            return obj.workspace.members.filter(user=request.user).exists()
        
        # If object is a workspace itself
        if hasattr(obj, 'members'):
            return obj.members.filter(user=request.user).exists()
        
        return False