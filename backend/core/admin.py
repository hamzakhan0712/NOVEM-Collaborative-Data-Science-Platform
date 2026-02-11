from django.db.models import Count, Q
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from accounts.models import User
from workspaces.models import Workspace
from projects.models import Project
from audit.models import AuditLog


def dashboard_callback(request, context):
    """
    Dashboard callback for Unfold admin
    Returns statistics and charts for the dashboard
    """
    # Get date ranges
    now = timezone.now()
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)
    
    # User statistics
    total_users = User.objects.count()
    active_users = User.objects.filter(
        account_state=User.AccountState.ACTIVE
    ).count()
    new_users_7d = User.objects.filter(
        date_joined__gte=last_7_days
    ).count()
    
    # Workspace statistics
    total_workspaces = Workspace.objects.count()
    org_workspaces = Workspace.objects.filter(
        workspace_type='organization'
    ).count()
    team_workspaces = Workspace.objects.filter(
        workspace_type='team'
    ).count()
    
    # Project statistics
    total_projects = Project.objects.count()
    active_projects = Project.objects.filter(
        updated_at__gte=last_30_days
    ).count()
    public_projects = Project.objects.filter(
        visibility='public'
    ).count()
    
    # Audit statistics
    recent_actions = AuditLog.objects.filter(
        timestamp__gte=last_7_days
    ).count()
    failed_actions = AuditLog.objects.filter(
        timestamp__gte=last_7_days,
        success=False
    ).count()
    
    # User growth data (last 7 days)
    user_growth = []
    for i in range(7):
        date = now - timedelta(days=6-i)
        count = User.objects.filter(
            date_joined__date=date.date()
        ).count()
        user_growth.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    
    # Project activity (last 7 days)
    project_activity = []
    for i in range(7):
        date = now - timedelta(days=6-i)
        count = Project.objects.filter(
            created_at__date=date.date()
        ).count()
        project_activity.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    
    context.update({
        "kpi": [
            {
                "title": "Total Users",
                "metric": total_users,
                "footer": f"{new_users_7d} new in last 7 days",
                "link": reverse("admin:accounts_user_changelist"),
            },
            {
                "title": "Active Users",
                "metric": active_users,
                "footer": f"{(active_users/total_users*100):.1f}% of total" if total_users > 0 else "0%",
                "link": reverse("admin:accounts_user_changelist") + "?account_state__exact=active",
            },
            {
                "title": "Total Workspaces",
                "metric": total_workspaces,
                "footer": f"{org_workspaces} orgs, {team_workspaces} teams",
                "link": reverse("admin:workspaces_workspace_changelist"),
            },
            {
                "title": "Total Projects",
                "metric": total_projects,
                "footer": f"{active_projects} active (30d), {public_projects} public",
                "link": reverse("admin:projects_project_changelist"),
            },
        ],
        "charts": [
            {
                "title": "User Growth (Last 7 Days)",
                "description": "New user registrations",
                "type": "bar",
                "data": {
                    "labels": [item['date'] for item in user_growth],
                    "datasets": [
                        {
                            "label": "New Users",
                            "data": [item['count'] for item in user_growth],
                        }
                    ],
                },
            },
            {
                "title": "Project Activity (Last 7 Days)",
                "description": "New projects created",
                "type": "line",
                "data": {
                    "labels": [item['date'] for item in project_activity],
                    "datasets": [
                        {
                            "label": "New Projects",
                            "data": [item['count'] for item in project_activity],
                        }
                    ],
                },
            },
        ],
        "progress": [
            {
                "title": "System Activity",
                "description": f"{recent_actions} actions in last 7 days",
                "value": min((recent_actions / 1000) * 100, 100),  # Cap at 100%
            },
            {
                "title": "Error Rate",
                "description": f"{failed_actions} failed actions",
                "value": (failed_actions / recent_actions * 100) if recent_actions > 0 else 0,
            },
        ],
    })
    
    return context