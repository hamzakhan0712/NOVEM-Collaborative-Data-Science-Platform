
import logging

logger = logging.getLogger(__name__)


class AuditMiddleware:
    """Middleware to capture IP and user agent for audit logs"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Store IP and user agent in request for later use
        request.audit_ip = self.get_client_ip(request)
        request.audit_user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        response = self.get_response(request)
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip