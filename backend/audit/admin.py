from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import AuditLog, AccessLog, SyncLog


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    list_display = ['id', 'user', 'action', 'category_badge', 'resource_type', 'success_badge', 'timestamp']
    list_filter = ['action_category', 'success', 'sync_status', 'timestamp']
    search_fields = ['user__email', 'action', 'resource_type', 'ip_address']
    readonly_fields = ['timestamp', 'synced_at']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Action', {
            'fields': ('user', 'action', 'action_category', 'resource_type', 'resource_id')
        }),
        ('Context', {
            'fields': ('ip_address', 'user_agent', 'details')
        }),
        ('Status', {
            'fields': ('success', 'error_message', 'sync_status', 'synced_at')
        }),
        ('Timestamps', {
            'fields': ('timestamp',)
        }),
    )
    
    @display(description="Category", label=True)
    def category_badge(self, obj):
        colors = {
            'auth': 'info',
            'account': 'warning',
            'workspace': 'success',
            'project': 'primary',
            'data': 'danger',
            'collaboration': 'warning',
            'sync': 'info',
            'admin': 'danger',
        }
        return {
            "value": obj.get_action_category_display(),
            "color": colors.get(obj.action_category, 'secondary'),
        }
    
    @display(description="Success", label=True)
    def success_badge(self, obj):
        return {
            "value": "Success" if obj.success else "Failed",
            "color": "success" if obj.success else "danger",
        }
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(AccessLog)
class AccessLogAdmin(ModelAdmin):
    list_display = ['id', 'user', 'resource_type', 'action_badge', 'workspace_id', 'project_id', 'timestamp']
    list_filter = ['action', 'resource_type', 'timestamp']
    search_fields = ['user__email', 'resource_name']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Access', {
            'fields': ('user', 'resource_type', 'resource_id', 'resource_name', 'action')
        }),
        ('Context', {
            'fields': ('workspace_id', 'project_id')
        }),
        ('Metadata', {
            'fields': ('data_volume', 'row_count')
        }),
        ('Timestamps', {
            'fields': ('timestamp',)
        }),
    )
    
    @display(description="Action", label=True)
    def action_badge(self, obj):
        colors = {
            'view': 'info',
            'download': 'warning',
            'export': 'danger',
            'query': 'primary',
            'share': 'success',
        }
        return {
            "value": obj.get_action_display(),
            "color": colors.get(obj.action, 'secondary'),
        }
    
    def has_add_permission(self, request):
        return False


@admin.register(SyncLog)
class SyncLogAdmin(ModelAdmin):
    list_display = ['id', 'user', 'sync_type_badge', 'status_badge', 'items_synced', 'items_failed', 'duration_seconds', 'started_at']
    list_filter = ['sync_type', 'status', 'started_at']
    search_fields = ['user__email']
    readonly_fields = ['started_at', 'completed_at', 'duration_seconds']
    date_hierarchy = 'started_at'
    
    fieldsets = (
        ('Sync', {
            'fields': ('user', 'sync_type', 'status')
        }),
        ('Metrics', {
            'fields': ('items_synced', 'items_failed', 'bytes_transferred')
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'duration_seconds')
        }),
        ('Details', {
            'fields': ('details', 'error_message')
        }),
    )
    
    @display(description="Type", label=True)
    def sync_type_badge(self, obj):
        colors = {
            'metadata': 'info',
            'projects': 'primary',
            'published': 'warning',
            'full': 'danger',
        }
        return {
            "value": obj.get_sync_type_display(),
            "color": colors.get(obj.sync_type, 'secondary'),
        }
    
    @display(description="Status", label=True)
    def status_badge(self, obj):
        colors = {
            'started': 'info',
            'in_progress': 'warning',
            'completed': 'success',
            'failed': 'danger',
            'partial': 'warning',
        }
        return {
            "value": obj.get_status_display(),
            "color": colors.get(obj.status, 'secondary'),
        }
    
    def has_add_permission(self, request):
        return False