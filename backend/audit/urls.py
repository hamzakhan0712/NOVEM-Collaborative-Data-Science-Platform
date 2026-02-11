from django.urls import path
from . import views

urlpatterns = [
    # Audit logs
    path('logs/', views.AuditLogListView.as_view(), name='audit_logs'),
    path('logs/summary/', views.audit_summary, name='audit_summary'),
    path('logs/cleanup/', views.cleanup_old_logs, name='cleanup_logs'),
    
    # Access logs (data governance)
    path('access/', views.AccessLogListView.as_view(), name='access_logs'),
    
    # Sync logs (offline-first monitoring)
    path('sync/', views.SyncLogListView.as_view(), name='sync_logs'),
]