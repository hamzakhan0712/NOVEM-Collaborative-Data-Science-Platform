    
from .models import Workspace


def workspace_count(request):
    """Return workspace count for admin sidebar badge"""
    return Workspace.objects.count()
    
    