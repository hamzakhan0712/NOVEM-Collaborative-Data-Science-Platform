from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.http import Http404
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for NOVEM
    Provides consistent error responses and logging
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Log the exception
    request = context.get('request')
    user = request.user if request and hasattr(request, 'user') else None
    
    logger.error(
        f"Exception: {type(exc).__name__} | User: {user} | "
        f"Path: {request.path if request else 'Unknown'} | "
        f"Message: {str(exc)}"
    )
    
    # If response is None, it's an unhandled exception
    if response is None:
        if isinstance(exc, Http404):
            return Response(
                {'error': 'Resource not found', 'detail': str(exc)},
                status=status.HTTP_404_NOT_FOUND
            )
        elif isinstance(exc, PermissionDenied):
            return Response(
                {'error': 'Permission denied', 'detail': str(exc)},
                status=status.HTTP_403_FORBIDDEN
            )
        else:
            return Response(
                {'error': 'Internal server error', 'detail': 'An unexpected error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Customize response format for consistency
    if hasattr(response, 'data'):
        custom_response_data = {
            'error': True,
            'status_code': response.status_code,
        }
        
        # Handle different error formats
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_response_data['message'] = response.data['detail']
            else:
                custom_response_data['errors'] = response.data
        else:
            custom_response_data['message'] = str(response.data)
        
        response.data = custom_response_data
    
    return response