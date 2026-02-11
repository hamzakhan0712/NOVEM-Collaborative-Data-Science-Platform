from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import Workspace, WorkspaceMembership, WorkspaceInvitation, WorkspaceJoinRequest


@admin.register(Workspace)
class WorkspaceAdmin(ModelAdmin):
    list_display = ['name', 'workspace_type_badge', 'owner', 'visibility_badge', 'member_count', 'created_at']
    list_filter = ['workspace_type', 'visibility', 'created_at']
    search_fields = ['name', 'description', 'owner__email']
    readonly_fields = ['slug', 'created_at', 'updated_at', 'sync_version']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'description', 'avatar')
        }),
        ('Configuration', {
            'fields': ('workspace_type', 'visibility', 'owner')
        }),
        ('Settings', {
            'fields': (
                'website',
                'default_project_visibility',
                'allow_member_project_creation',
                'require_join_approval'
            )
        }),
        ('Sync', {
            'fields': ('sync_version', 'last_synced')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    @display(description="Type", label=True)
    def workspace_type_badge(self, obj):
        colors = {
            'personal': 'info',
            'team': 'warning',
            'organization': 'success',
        }
        return {
            "value": obj.get_workspace_type_display(),
            "color": colors.get(obj.workspace_type, 'secondary'),
        }
    
    @display(description="Visibility", label=True)
    def visibility_badge(self, obj):
        colors = {
            'private': 'danger',
            'internal': 'warning',
            'public': 'success',
        }
        return {
            "value": obj.get_visibility_display(),
            "color": colors.get(obj.visibility, 'secondary'),
        }
    
    @display(description="Members")
    def member_count(self, obj):
        return obj.workspacemembership_set.count()


@admin.register(WorkspaceMembership)
class WorkspaceMembershipAdmin(ModelAdmin):
    list_display = ['workspace', 'user', 'role_badge', 'permissions_summary', 'joined_at']
    list_filter = ['role', 'joined_at']
    search_fields = ['workspace__name', 'user__email']
    readonly_fields = ['joined_at']
    
    fieldsets = (
        ('Membership', {
            'fields': ('workspace', 'user', 'role', 'invited_by')
        }),
        ('Permissions', {
            'fields': (
                'can_create_projects',
                'can_invite_members',
                'can_manage_settings'
            )
        }),
        ('Timestamps', {
            'fields': ('joined_at',)
        }),
    )
    
    @display(description="Role", label=True)
    def role_badge(self, obj):
        colors = {
            'owner': 'danger',
            'admin': 'warning',
            'member': 'success',
            'viewer': 'info',
        }
        return {
            "value": obj.get_role_display(),
            "color": colors.get(obj.role, 'secondary'),
        }
    
    @display(description="Permissions")
    def permissions_summary(self, obj):
        perms = []
        if obj.can_create_projects:
            perms.append("Create")
        if obj.can_invite_members:
            perms.append("Invite")
        if obj.can_manage_settings:
            perms.append("Manage")
        return ", ".join(perms) if perms else "View only"


@admin.register(WorkspaceInvitation)
class WorkspaceInvitationAdmin(ModelAdmin):
    list_display = ['workspace', 'invitee_email', 'role', 'status_badge', 'invited_at', 'expires_at']
    list_filter = ['status', 'role', 'invited_at']
    search_fields = ['workspace__name', 'invitee_email', 'inviter__email']
    readonly_fields = ['invited_at', 'responded_at']
    
    fieldsets = (
        ('Invitation', {
            'fields': ('workspace', 'inviter', 'invitee_email', 'invitee', 'role')
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


@admin.register(WorkspaceJoinRequest)
class WorkspaceJoinRequestAdmin(ModelAdmin):
    list_display = ['workspace', 'user', 'status_badge', 'created_at', 'reviewed_at']
    list_filter = ['status', 'created_at']
    search_fields = ['workspace__name', 'user__email']
    readonly_fields = ['created_at', 'reviewed_at']
    
    fieldsets = (
        ('Request', {
            'fields': ('workspace', 'user', 'message')
        }),
        ('Review', {
            'fields': ('status', 'reviewed_by', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
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