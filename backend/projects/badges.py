    
from .models import Project


def project_count(request):
    """Return project count for admin sidebar badge"""
    return Project.objects.count()
    