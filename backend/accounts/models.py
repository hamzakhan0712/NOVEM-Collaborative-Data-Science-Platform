from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Extended User model"""
    
    class AccountState(models.TextChoices):
        INVITED = 'invited', _('Invited but not registered')
        REGISTERED = 'registered', _('Registered but not onboarded')
        ACTIVE = 'active', _('Active')
        SUSPENDED = 'suspended', _('Suspended')
    
    class ProfileVisibility(models.TextChoices):
        PUBLIC = 'public', _('Public')
        WORKSPACE = 'workspace', _('Workspace Members Only')
        PRIVATE = 'private', _('Private')
    
    email = models.EmailField(_('email address'), unique=True)
    account_state = models.CharField(
        max_length=20,
        choices=AccountState.choices,
        default=AccountState.REGISTERED
    )
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True
    )
    profile_visibility = models.CharField(
        max_length=20,
        choices=ProfileVisibility.choices,
        default=ProfileVisibility.WORKSPACE
    )
    show_active_status = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    offline_grace_expires = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email

class Profile(models.Model):
    """User profile with additional information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    organization = models.CharField(max_length=255, blank=True)
    job_title = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    
    # Preferences
    theme = models.CharField(max_length=20, default='light')
    
    # Email notification preferences
    email_notifications_enabled = models.BooleanField(default=True)
    email_project_invitations = models.BooleanField(default=True)
    email_project_updates = models.BooleanField(default=True)
    email_project_comments = models.BooleanField(default=True)
    email_workspace_invitations = models.BooleanField(default=True)
    email_workspace_activity = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile of {self.user.email}"

class UserSession(models.Model):
    """Track user sessions across devices"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_sessions'
        ordering = ['-last_activity']
    
    def __str__(self):
        return f"{self.user.email} - {self.device_name or 'Unknown Device'}"


class Notification(models.Model):
    """User notifications"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"