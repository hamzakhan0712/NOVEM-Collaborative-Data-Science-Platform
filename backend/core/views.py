from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import connection
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def landing_page(request):
    """Serve the public landing page"""
    return render(request, 'landing.html')


@api_view(["GET", "HEAD", "OPTIONS"])
@permission_classes([AllowAny])
def system_health(request):
    """
    System-wide health check endpoint
    Used by desktop app to detect online/offline state
    
    Supports:
    - GET: Full health response with details
    - HEAD: Lightweight connectivity check (just status code)
    - OPTIONS: CORS preflight
    """
    
    # Handle HEAD request (lightweight check)
    if request.method == "HEAD":
        try:
            connection.ensure_connection()
            return Response(status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # Handle OPTIONS (CORS preflight)
    if request.method == "OPTIONS":
        return Response(status=status.HTTP_200_OK)
    
    # Handle GET request (full health details)
    try:
        # Check database connectivity
        connection.ensure_connection()
        db_status = 'connected'
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        db_status = 'disconnected'
        return Response({
            'status': 'unhealthy',
            'service': 'novem-coordination-layer',
            'timestamp': timezone.now().isoformat(),
            'database': db_status,
            'error': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    # Check if in maintenance mode
    maintenance_mode = getattr(settings, 'MAINTENANCE_MODE', False)
    
    response_data = {
        'status': 'healthy',
        'service': 'novem-coordination-layer',
        'timestamp': timezone.now().isoformat(),
        'database': db_status,
        'maintenance_mode': maintenance_mode,
        'version': '1.0.0',
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def system_info(request):
    """
    System information endpoint
    Returns non-sensitive system configuration for desktop app
    """
    return Response({
        'service': 'NOVEM Coordination Layer',
        'version': '1.0.0',
        'description': 'Metadata synchronization and collaboration coordination',
        'capabilities': [
            'authentication',
            'metadata_sync',
            'project_coordination',
            'audit_logging',
            'role_management',
        ],
        'offline_grace_period_days': getattr(settings, 'OFFLINE_GRACE_PERIOD_DAYS', 7),
        'sync_interval_seconds': getattr(settings, 'METADATA_SYNC_INTERVAL', 3600),
        'max_upload_size_bytes': getattr(settings, 'MAX_UPLOAD_SIZE', 524288000),
    })