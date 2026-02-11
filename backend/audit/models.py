from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class AuditLog(models.Model):
    """System-wide audit log for governance and compliance"""
    
    # Action categories aligned with NOVEM lifecycle
    ACTION_CATEGORIES = (
        ('auth', 'Authentication'),
        ('account', 'Account Management'),
        ('workspace', 'Workspace'),
        ('project', 'Project'),
        ('data', 'Data Access'),
        ('collaboration', 'Collaboration'),
        ('sync', 'Synchronization'),
        ('admin', 'Administration'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=100)
    action_category = models.CharField(
        max_length=20, 
        choices=ACTION_CATEGORIES,
        default='account'
    )
    resource_type = models.CharField(max_length=50)
    resource_id = models.IntegerField(null=True, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Additional context
    details = models.JSONField(default=dict, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    # Sync tracking
    synced_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('synced', 'Synced'),
            ('failed', 'Failed'),
        ],
        default='synced'
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['action_category', '-timestamp']),
            models.Index(fields=['sync_status']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"
    
    @classmethod
    def cleanup_old_logs(cls, days=90):
        """Remove audit logs older than specified days (compliance retention)"""
        cutoff = timezone.now() - timedelta(days=days)
        deleted_count, _ = cls.objects.filter(timestamp__lt=cutoff).delete()
        return deleted_count
    
    @classmethod
    def log_action(cls, user, action, resource_type, resource_id=None, 
                   category='account', details=None, success=True, 
                   error_message='', ip_address=None, user_agent=''):
        """Helper method to create audit log entries"""
        return cls.objects.create(
            user=user,
            action=action,
            action_category=category,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent
        )


class AccessLog(models.Model):
    """Track data access patterns for security and compliance"""
    
    ACCESS_TYPES = (
        ('view', 'View'),
        ('download', 'Download'),
        ('export', 'Export'),
        ('query', 'Query'),
        ('share', 'Share'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='access_logs'
    )
    resource_type = models.CharField(max_length=50)  # 'dataset', 'analysis', 'model', etc.
    resource_id = models.IntegerField()
    resource_name = models.CharField(max_length=255, blank=True)
    
    action = models.CharField(max_length=50, choices=ACCESS_TYPES)
    
    # Context
    workspace_id = models.IntegerField(null=True, blank=True)
    project_id = models.IntegerField(null=True, blank=True)
    
    # Metadata (for data governance)
    data_volume = models.BigIntegerField(null=True, blank=True)  # bytes
    row_count = models.IntegerField(null=True, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['workspace_id', '-timestamp']),
            models.Index(fields=['project_id', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.resource_type} - {self.timestamp}"


class SyncLog(models.Model):
    """Track synchronization events for offline-first architecture"""
    
    SYNC_TYPES = (
        ('metadata', 'Metadata Sync'),
        ('projects', 'Project Sync'),
        ('published', 'Published Artifacts'),
        ('full', 'Full Sync'),
    )
    
    SYNC_STATUS = (
        ('started', 'Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partial'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sync_logs'
    )
    
    sync_type = models.CharField(max_length=20, choices=SYNC_TYPES)
    status = models.CharField(max_length=20, choices=SYNC_STATUS, default='started')
    
    # Metrics
    items_synced = models.IntegerField(default=0)
    items_failed = models.IntegerField(default=0)
    bytes_transferred = models.BigIntegerField(default=0)
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    
    # Details
    details = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', '-started_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.sync_type} - {self.status} - {self.started_at}"
    
    def mark_completed(self, items_synced=0, items_failed=0, bytes_transferred=0):
        """Mark sync as completed and calculate duration"""
        self.status = 'completed' if items_failed == 0 else 'partial'
        self.completed_at = timezone.now()
        self.duration_seconds = (self.completed_at - self.started_at).total_seconds()
        self.items_synced = items_synced
        self.items_failed = items_failed
        self.bytes_transferred = bytes_transferred
        self.save()
    
    def mark_failed(self, error_message=''):
        """Mark sync as failed"""
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.duration_seconds = (self.completed_at - self.started_at).total_seconds()
        self.error_message = error_message
        self.save()