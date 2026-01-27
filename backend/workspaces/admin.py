from django.contrib import admin
from .models import Workspace, WorkspaceMembership, WorkspaceInvitation

@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'workspace_type', 'owner', 'visibility', 'created_at']
    list_filter = ['workspace_type', 'visibility']
    search_fields = ['name', 'owner__email']

@admin.register(WorkspaceMembership)
class WorkspaceMembershipAdmin(admin.ModelAdmin):
    list_display = ['workspace', 'user', 'role', 'joined_at']
    list_filter = ['role']
    search_fields = ['workspace__name', 'user__email']

@admin.register(WorkspaceInvitation)
class WorkspaceInvitationAdmin(admin.ModelAdmin):
    list_display = ['workspace', 'invitee_email', 'status', 'invited_at']
    list_filter = ['status']
    search_fields = ['workspace__name', 'invitee_email']