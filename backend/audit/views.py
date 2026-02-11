from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, AccessLog, SyncLog
from .serializers import (
    AuditLogSerializer, AccessLogSerializer, 
    SyncLogSerializer, AuditSummarySerializer
)
import logging

logger = logging.getLogger(__name__)


class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AuditLogListView(generics.ListAPIView):
    """List audit logs (admin only for full access, users see their own)"""
    serializer_class = AuditLogSerializer
    pagination_class = AuditLogPagination
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = AuditLog.objects.all()
        user = self.request.user
        
        # Non-admin users only see their own logs
        if not user.is_staff:
            queryset = queryset.filter(user=user)
        
        # Filters
        action_category = self.request.query_params.get('category')
        resource_type = self.request.query_params.get('resource_type')
        success = self.request.query_params.get('success')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if action_category:
            queryset = queryset.filter(action_category=action_category)
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if success is not None:
            queryset = queryset.filter(success=success.lower() == 'true')
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        
        return queryset.select_related('user')


class AccessLogListView(generics.ListAPIView):
    """List access logs for data governance"""
    serializer_class = AccessLogSerializer
    pagination_class = AuditLogPagination
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = AccessLog.objects.all()
        user = self.request.user
        
        # Non-admin users only see their own access logs
        if not user.is_staff:
            queryset = queryset.filter(user=user)
        
        # Filters
        resource_type = self.request.query_params.get('resource_type')
        action = self.request.query_params.get('action')
        workspace_id = self.request.query_params.get('workspace_id')
        project_id = self.request.query_params.get('project_id')
        
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if action:
            queryset = queryset.filter(action=action)
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        return queryset.select_related('user')


class SyncLogListView(generics.ListAPIView):
    """List sync logs for offline-first monitoring"""
    serializer_class = SyncLogSerializer
    pagination_class = AuditLogPagination
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = SyncLog.objects.filter(user=self.request.user)
        
        # Filters
        sync_type = self.request.query_params.get('sync_type')
        status = self.request.query_params.get('status')
        
        if sync_type:
            queryset = queryset.filter(sync_type=sync_type)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_summary(request):
    """Get audit summary for current user"""
    user = request.user
    
    # Time ranges
    now = timezone.now()
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)
    
    # User's audit stats
    total_actions = AuditLog.objects.filter(user=user).count()
    recent_actions = AuditLog.objects.filter(user=user, timestamp__gte=last_7_days).count()
    failed_actions = AuditLog.objects.filter(user=user, success=False, timestamp__gte=last_30_days).count()
    
    # Access stats
    total_access = AccessLog.objects.filter(user=user).count()
    recent_access = AccessLog.objects.filter(user=user, timestamp__gte=last_7_days).count()
    
    # Sync stats
    total_syncs = SyncLog.objects.filter(user=user).count()
    last_sync = SyncLog.objects.filter(user=user).order_by('-started_at').first()
    failed_syncs = SyncLog.objects.filter(user=user, status='failed', started_at__gte=last_7_days).count()
    
    # Actions by category (last 30 days)
    actions_by_category = AuditLog.objects.filter(
        user=user, 
        timestamp__gte=last_30_days
    ).values('action_category').annotate(count=Count('id'))
    
    return Response({
        'audit': {
            'total_actions': total_actions,
            'recent_actions_7d': recent_actions,
            'failed_actions_30d': failed_actions,
            'actions_by_category': list(actions_by_category)
        },
        'access': {
            'total_access': total_access,
            'recent_access_7d': recent_access
        },
        'sync': {
            'total_syncs': total_syncs,
            'last_sync': {
                'timestamp': last_sync.started_at if last_sync else None,
                'status': last_sync.status if last_sync else None,
                'duration': last_sync.duration_seconds if last_sync else None
            } if last_sync else None,
            'failed_syncs_7d': failed_syncs
        }
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def cleanup_old_logs(request):
    """Cleanup old audit logs (admin only)"""
    days = request.data.get('days', 90)
    
    try:
        deleted_count = AuditLog.cleanup_old_logs(days=days)
        
        logger.info(f"Cleaned up {deleted_count} audit logs older than {days} days")
        
        return Response({
            'message': f'Successfully deleted {deleted_count} logs',
            'retention_days': days
        })
    except Exception as e:
        logger.error(f"Failed to cleanup logs: {str(e)}")
        return Response({
            'error': 'Cleanup failed',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)