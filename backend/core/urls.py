from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .views import landing_page, system_health, system_info
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Landing page
    path('', landing_page, name='landing'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # System endpoints (no auth required)
    path('api/health/', system_health, name='system_health'),
    path('api/info/', system_info, name='system_info'),
    
    # API routes
    path('api/auth/', include('accounts.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/workspaces/', include('workspaces.urls')),
    path('api/projects/', include('projects.urls')),
    
    # JWT token refresh
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)