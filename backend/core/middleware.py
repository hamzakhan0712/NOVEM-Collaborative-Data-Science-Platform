import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

logger = logging.getLogger(__name__)


class MaintenanceModeMiddleware(MiddlewareMixin):
    """
    Middleware to handle maintenance mode
    Blocks all requests except health checks and admin when enabled
    """
    
    def process_request(self, request):
        from django.conf import settings
        
        # Skip if not in maintenance mode
        if not getattr(settings, 'MAINTENANCE_MODE', False):
            return None
        
        # Allow health checks and admin
        allowed_paths = ['/api/health/', '/admin/']
        if any(request.path.startswith(path) for path in allowed_paths):
            return None
        
        # Block all other requests
        return JsonResponse({
            'error': 'Service temporarily unavailable',
            'message': 'NOVEM is currently undergoing maintenance. Please try again later.',
            'maintenance_mode': True
        }, status=503)


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all API requests for audit purposes
    """
    
    def process_request(self, request):
        # Skip logging for static files and health checks
        skip_paths = ['/static/', '/media/', '/api/health/', '/admin/jsi18n/']
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Log API requests
        if request.path.startswith('/api/'):
            user = request.user if hasattr(request, 'user') and request.user.is_authenticated else 'Anonymous'
            logger.info(
                f"API Request | User: {user} | Method: {request.method} | "
                f"Path: {request.path} | IP: {self.get_client_ip(request)}"
            )
        
        return None
    
    def process_response(self, request, response):
        # Skip logging for static files and health checks
        skip_paths = ['/static/', '/media/', '/api/health/', '/admin/jsi18n/']
        if any(request.path.startswith(path) for path in skip_paths):
            return response
        
        # Log API responses with error status
        if request.path.startswith('/api/') and response.status_code >= 400:
            user = request.user if hasattr(request, 'user') and request.user.is_authenticated else 'Anonymous'
            logger.warning(
                f"API Error Response | User: {user} | Method: {request.method} | "
                f"Path: {request.path} | Status: {response.status_code}"
            )
        
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip