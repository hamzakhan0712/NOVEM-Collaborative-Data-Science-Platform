from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import Project, ProjectMembership, ProjectJoinRequest, ProjectInvitation


@admin.register(Project)
class ProjectAdmin(ModelAdmin):
    list_display = ['name', 'workspace', 'creator', 'visibility_badge', 'member_count', 'created_at']
    list_filter = ['visibility', 'created_at']
    search_fields = ['name', 'description', 'creator__email', 'workspace__name']
    readonly_fields = ['slug', 'created_at', 'updated_at', 'sync_version']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'description', 'tags')
        }),
        ('Organization', {
            'fields': ('workspace', 'creator', 'visibility')
        }),
        ('Sync', {
            'fields': ('sync_version', 'last_synced')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    @display(description="Visibility", label=True)
    def visibility_badge(self, obj):
        colors = {
            'private': 'danger',
            'team': 'warning',
            'public': 'success',
        }
        return {
            "value": obj.get_visibility_display(),
            "color": colors.get(obj.visibility, 'secondary'),
        }
    
    @display(description="Members")
    def member_count(self, obj):
        return obj.memberships.count()


@admin.register(ProjectMembership)
class ProjectMembershipAdmin(ModelAdmin):
    list_display = ['project', 'user', 'role_badge', 'permissions_summary', 'joined_at']
    list_filter = ['role', 'joined_at']
    search_fields = ['project__name', 'user__email']
    readonly_fields = ['joined_at']
    
    fieldsets = (
        ('Membership', {
            'fields': ('project', 'user', 'role')
        }),
        ('Permissions', {
            'fields': (
                'can_view_data',
                'can_run_analysis',
                'can_publish_results',
                'can_manage_connectors',
                'can_invite_members',
                'can_execute_pipelines',
                'can_create_datasets',
                'can_manage_data_sources'
            )
        }),
        ('Timestamps', {
            'fields': ('joined_at',)
        }),
    )
    
    @display(description="Role", label=True)
    def role_badge(self, obj):
        colors = {
            'lead': 'danger',
            'contributor': 'warning',
            'analyst': 'success',
            'viewer': 'info',
        }
        return {
            "value": obj.get_role_display(),
            "color": colors.get(obj.role, 'secondary'),
        }
    
    @display(description="Permissions")
    def permissions_summary(self, obj):
        perms = []
        if obj.can_view_data:
            perms.append("View")
        if obj.can_run_analysis:
            perms.append("Analyze")
        if obj.can_publish_results:
            perms.append("Publish")
        if obj.can_manage_connectors:
            perms.append("Connectors")
        if obj.can_invite_members:
            perms.append("Invite")
        return ", ".join(perms) if perms else "No permissions"


@admin.register(ProjectJoinRequest)
class ProjectJoinRequestAdmin(ModelAdmin):
    list_display = ['project', 'user', 'status_badge', 'requested_at', 'reviewed_at']
    list_filter = ['status', 'requested_at']
    search_fields = ['project__name', 'user__email']
    readonly_fields = ['requested_at', 'reviewed_at']
    
    fieldsets = (
        ('Request', {
            'fields': ('project', 'user', 'message')
        }),
        ('Review', {
            'fields': ('status', 'reviewed_by', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('requested_at',)
        }),
    )
    
    @display(description="Status", label=True)
    def status_badge(self, obj):
        colors = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger',
        }
        return {
            "value": obj.get_status_display(),
            "color": colors.get(obj.status, 'info'),
        }


@admin.register(ProjectInvitation)
class ProjectInvitationAdmin(ModelAdmin):
    list_display = ['project', 'invitee_email', 'role', 'status_badge', 'invited_at', 'expires_at']
    list_filter = ['status', 'role', 'invited_at']
    search_fields = ['project__name', 'invitee_email', 'inviter__email']
    readonly_fields = ['invited_at', 'responded_at']
    
    fieldsets = (
        ('Invitation', {
            'fields': ('project', 'inviter', 'invitee_email', 'invitee', 'role')
        }),
        ('Message', {
            'fields': ('message',)
        }),
        ('Status', {
            'fields': ('status', 'invited_at', 'responded_at', 'expires_at')
        }),
    )
    
    @display(description="Status", label=True)
    def status_badge(self, obj):
        colors = {
            'pending': 'warning',
            'accepted': 'success',
            'declined': 'danger',
            'expired': 'secondary',
        }
        return {
            "value": obj.get_status_display(),
            "color": colors.get(obj.status, 'info'),
        }