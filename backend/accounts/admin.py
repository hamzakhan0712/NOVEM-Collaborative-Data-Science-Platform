from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import User, Profile, UserSession, Notification


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    list_display = ['email', 'username', 'display_name', 'account_state_badge', 'is_staff', 'date_joined', 'last_sync']
    list_filter = ['account_state', 'is_staff', 'is_active', 'date_joined']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'username', 'password')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Account Status', {
            'fields': ('account_state',)
        }),
        ('Sync & Activity', {
            'fields': ('last_sync', 'offline_grace_expires')
        }),
        ('Important Dates', {
            'fields': ('date_joined', 'last_login')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'first_name', 'last_name'),
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login', 'last_sync']
    
    @display(description="Account State", label=True)
    def account_state_badge(self, obj):
        colors = {
            'registered': 'warning',
            'active': 'success',
            'suspended': 'danger',
            'deleted': 'secondary',
        }
        return {
            "value": obj.get_account_state_display(),
            "color": colors.get(obj.account_state, 'info'),
        }
    
    @display(description="Full Name")
    def display_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


@admin.register(Profile)
class ProfileAdmin(ModelAdmin):
    list_display = ['user', 'organization', 'job_title', 'location', 'bio_preview']
    list_filter = ['location']
    search_fields = ['user__email', 'organization', 'job_title', 'location']
    readonly_fields = ['user']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Professional Info', {
            'fields': ('organization', 'job_title', 'location', 'website')
        }),
        ('About', {
            'fields': ('bio', 'avatar')
        }),
        ('Social Links', {
            'fields': ('github', 'linkedin', 'twitter')
        }),
        ('Preferences', {
            'fields': ('timezone', 'language', 'theme')
        }),
    )
    
    @display(description="Bio")
    def bio_preview(self, obj):
        if obj.bio:
            return obj.bio[:50] + '...' if len(obj.bio) > 50 else obj.bio
        return '-'


@admin.register(UserSession)
class UserSessionAdmin(ModelAdmin):
    list_display = ['user', 'device_name', 'is_active', 'last_activity', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__email', 'device_name', 'ip_address']
    readonly_fields = ['session_key', 'created_at', 'last_activity']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Session Info', {
            'fields': ('session_key', 'device_name', 'ip_address', 'user_agent')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'last_activity')
        }),
    )
    
    @display(description="Device")
    def device_name(self, obj):
        return obj.device_name if obj.device_name else obj.user_agent[:50] if obj.user_agent else 'Unknown'


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ['user', 'type_display', 'title', 'read_status', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'title', 'message']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Notification', {
            'fields': ('title', 'message', 'data')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    @display(description="Type")
    def type_display(self, obj):
        # Extract type from data if available
        if obj.data and isinstance(obj.data, dict):
            return obj.data.get('type', 'General')
        return 'General'
    
    @display(description="Read")
    def read_status(self, obj):
        # Check if notification has been read (you can add a read_at field to model)
        return '✓' if hasattr(obj, 'read_at') and obj.read_at else '✗'