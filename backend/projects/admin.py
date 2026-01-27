from django.contrib import admin
from .models import Project, ProjectMembership, ProjectJoinRequest, ProjectInvitation

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'workspace', 'creator', 'visibility', 'created_at']
    list_filter = ['visibility']
    search_fields = ['name', 'creator__email']

@admin.register(ProjectMembership)
class ProjectMembershipAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'role', 'joined_at']
    list_filter = ['role']

@admin.register(ProjectJoinRequest)
class ProjectJoinRequestAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'status', 'requested_at']
    list_filter = ['status']

@admin.register(ProjectInvitation)
class ProjectInvitationAdmin(admin.ModelAdmin):
    list_display = ['project', 'invitee_email', 'status', 'invited_at']
    list_filter = ['status']