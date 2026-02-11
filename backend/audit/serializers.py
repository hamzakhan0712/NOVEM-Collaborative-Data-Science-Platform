from rest_framework import serializers
from .models import AuditLog, AccessLog, SyncLog
from django.contrib.auth import get_user_model

User = get_user_model()


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'action', 'action_category', 'resource_type', 'resource_id',
            'ip_address', 'user_agent', 'details', 'success', 'error_message',
            'sync_status', 'synced_at', 'timestamp'
        ]
        read_only_fields = fields
    
    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Unknown"


class AccessLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AccessLog
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'resource_type', 'resource_id', 'resource_name',
            'action', 'workspace_id', 'project_id',
            'data_volume', 'row_count', 'timestamp'
        ]
        read_only_fields = fields
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username


class SyncLogSerializer(serializers.ModelSerializer):
    duration_display = serializers.SerializerMethodField()
    
    class Meta:
        model = SyncLog
        fields = [
            'id', 'user', 'sync_type', 'status',
            'items_synced', 'items_failed', 'bytes_transferred',
            'started_at', 'completed_at', 'duration_seconds', 'duration_display',
            'details', 'error_message'
        ]
        read_only_fields = fields
    
    def get_duration_display(self, obj):
        if obj.duration_seconds:
            if obj.duration_seconds < 60:
                return f"{obj.duration_seconds:.1f}s"
            return f"{obj.duration_seconds / 60:.1f}m"
        return None


class AuditSummarySerializer(serializers.Serializer):
    total_actions = serializers.IntegerField()
    recent_actions_7d = serializers.IntegerField()
    failed_actions_30d = serializers.IntegerField()
    actions_by_category = serializers.ListField()