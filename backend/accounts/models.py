from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """Extended User model"""
    
    class AccountState(models.TextChoices):
        INVITED = 'invited', _('Invited but not registered')
        REGISTERED = 'registered', _('Registered but not onboarded')
        ACTIVE = 'active', _('Active')
        SUSPENDED = 'suspended', _('Suspended')
    
    email = models.EmailField(_('email address'), unique=True)
    account_state = models.CharField(
        max_length=20,
        choices=AccountState.choices,
        default=AccountState.REGISTERED
    )
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    profile_picture = models.URLField(blank=True, null=True)
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
    email_notifications = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile of {self.user.email}"