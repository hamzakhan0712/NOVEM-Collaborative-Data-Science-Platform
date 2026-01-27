from django.db import models
from django.conf import settings
from workspaces.models import Workspace
from projects.models import Project


class Connector(models.Model):
    """Data connector configuration (Meltano-based)"""
    
    class Scope(models.TextChoices):
        PERSONAL = 'personal', 'Personal'
        PROJECT = 'project', 'Project'
        WORKSPACE = 'workspace', 'Workspace'
    
    class ConnectorType(models.TextChoices):
        DATABASE = 'database', 'Database'
        API = 'api', 'API'
        FILE = 'file', 'File'
        CLOUD = 'cloud', 'Cloud Storage'
    
    name = models.CharField(max_length=255)
    connector_type = models.CharField(max_length=20, choices=ConnectorType.choices)
    scope = models.CharField(max_length=20, choices=Scope.choices)
    
    # Relationships
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='connectors')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='connectors')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, null=True, blank=True, related_name='connectors')
    
    # Configuration (encrypted credentials stored separately)
    config = models.JSONField(default=dict)
    credential_reference = models.CharField(max_length=255)  # Reference to encrypted credential
    
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.scope})"

class ConnectorAccess(models.Model):
    """Fine-grained access control for connectors"""
    connector = models.ForeignKey(Connector, on_delete=models.CASCADE, related_name='access_controls')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    can_read = models.BooleanField(default=False)
    can_write = models.BooleanField(default=False)
    can_manage = models.BooleanField(default=False)
    
    granted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='granted_accesses')
    granted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['connector', 'user']