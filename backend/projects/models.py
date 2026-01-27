from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Project(models.Model):
    """Data science project"""
    
    class Visibility(models.TextChoices):
        PRIVATE = 'private', _('Private')
        TEAM = 'team', _('Team')
        PUBLIC = 'public', _('Public')
    
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    description = models.TextField(blank=True)
    workspace = models.ForeignKey('workspaces.Workspace', on_delete=models.CASCADE, related_name='projects', null=True, blank=True)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_projects')
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PRIVATE)
    
    # Metadata
    tags = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['workspace', 'slug']
    
    def __str__(self):
        return self.name

class ProjectMembership(models.Model):
    """Project membership with explicit roles"""
    
    class Role(models.TextChoices):
        VIEWER = 'viewer', _('Viewer')
        ANALYST = 'analyst', _('Analyst')
        CONTRIBUTOR = 'contributor', _('Contributor')
        LEAD = 'lead', _('Lead')
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_memberships')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    
    # Permissions
    can_view_data = models.BooleanField(default=True)
    can_run_analysis = models.BooleanField(default=False)
    can_publish_results = models.BooleanField(default=False)
    can_manage_connectors = models.BooleanField(default=False)
    can_invite_members = models.BooleanField(default=False)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['project', 'user']
    
    def __str__(self):
        return f"{self.user.email} - {self.project.name} ({self.role})"
    
class ProjectJoinRequest(models.Model):
    """Join requests for projects"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='join_requests')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_join_requests')
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reviewed_join_requests')
    
    class Meta:
        unique_together = ['project', 'user']
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"{self.user.email} -> {self.project.name} ({self.status})" 
    

class ProjectInvitation(models.Model):
    """Project invitations sent by leads to invite users"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        ACCEPTED = 'accepted', _('Accepted')
        DECLINED = 'declined', _('Declined')
        EXPIRED = 'expired', _('Expired')
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invitations')
    inviter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invitations')
    invitee_email = models.EmailField()
    invitee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='received_invitations')
    role = models.CharField(max_length=20, choices=ProjectMembership.Role.choices, default=ProjectMembership.Role.VIEWER)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        # REMOVED: unique_together - using partial index instead
        ordering = ['-invited_at']
        # Add indexes for better query performance
        indexes = [
            models.Index(fields=['project', 'invitee_email', 'status']),
            models.Index(fields=['invitee', 'status']),
        ]
    
    def __str__(self):
        return f"Invitation to {self.invitee_email} for {self.project.name} ({self.status})"
    
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at and self.status == self.Status.PENDING
    