from workspaces.models import Workspace
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.text import slugify
from django.utils import timezone
from django.db import models, transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from datetime import timedelta
import logging

from .models import ProjectInvitation, Project, ProjectMembership, ProjectJoinRequest
from .serializers import (
    ProjectListSerializer, ProjectDetailSerializer, ProjectCreateSerializer,
    ProjectMembershipSerializer, ProjectInvitationSerializer, ProjectJoinRequestSerializer
)
from accounts.models import User
from audit.models import AuditLog

logger = logging.getLogger(__name__)


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Project CRUD operations aligned with NOVEM's results-first collaboration
    Projects are the primary unit of work where data access is controlled
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Return projects where user is:
        1. A member
        2. Has a pending invitation
        3. Public/Team projects in user's workspaces
        """
        user = self.request.user
        
        logger.info(f"Retrieving projects for user: {user.email} (ID: {user.id})")
        
        # Projects where user is a member
        member_projects = Q(memberships__user=user)
        
        # Projects where user has pending invitations
        invited_projects = Q(
            invitations__invitee=user,
            invitations__status=ProjectInvitation.Status.PENDING
        )
        
        # Public projects
        public_projects = Q(visibility=Project.Visibility.PUBLIC)
        
        # Team projects in user's workspaces
        user_workspaces = Workspace.objects.filter(
            Q(owner=user) | Q(workspacemembership__user=user)
        ).values_list('id', flat=True)
        
        team_projects_in_workspaces = Q(
            visibility=Project.Visibility.TEAM,
            workspace_id__in=user_workspaces
        )
        
        # Combine all conditions
        queryset = Project.objects.filter(
            member_projects | invited_projects | public_projects | team_projects_in_workspaces
        ).distinct().select_related(
            'creator', 
            'workspace'
        ).prefetch_related(
            'memberships__user'
        )
        
        # Filter by workspace if provided
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            try:
                workspace_id = int(workspace_id)
                logger.info(f"Filtering by workspace: {workspace_id}")
                queryset = queryset.filter(workspace_id=workspace_id)
            except (ValueError, TypeError):
                logger.error(f"Invalid workspace_id: {workspace_id}")
        
        # Filter by visibility
        visibility = self.request.query_params.get('visibility')
        if visibility:
            logger.info(f"Filtering by visibility: {visibility}")
            queryset = queryset.filter(visibility=visibility)
        
        count = queryset.count()
        logger.info(f"Found {count} projects for user {user.email}")
        
        return queryset.order_by('-updated_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        elif self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectListSerializer
    
    def get_serializer_context(self):
        """Ensure request is always in serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def list(self, request, *args, **kwargs):
        """List user's projects with enhanced logging"""
        logger.info(f"Listing projects for: {request.user.email}")
        logger.info(f"Query params: {dict(request.query_params)}")
        
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"Successfully serialized {len(serializer.data)} projects")
            
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error listing projects: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to load projects: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create project with workspace validation
        Aligned with NOVEM's local-first architecture
        """
        workspace_id = serializer.validated_data.pop('workspace_id', None)
        workspace = None
        user = self.request.user
        
        logger.info(f"Creating project for user: {user.email}")
        logger.info(f"Workspace ID: {workspace_id}")
        
        if workspace_id:
            workspace = get_object_or_404(Workspace, id=workspace_id)
            
            # Verify user has permission to create projects in this workspace
            is_owner = workspace.owner_id == user.id
            membership = workspace.workspacemembership_set.filter(user=user).first()
            
            if not is_owner and (not membership or not membership.can_create_projects):
                logger.error(f"User {user.email} lacks permission to create projects in workspace {workspace.name}")
                raise PermissionError("You don't have permission to create projects in this workspace")
            
            logger.info(f"User has permission in workspace: {workspace.name}")
        
        # Generate unique slug
        base_slug = slugify(serializer.validated_data['name'])
        slug = base_slug
        counter = 1
        
        while Project.objects.filter(workspace=workspace, slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        logger.info(f"Generated slug: {slug}")
        
        try:
            project = serializer.save(
                creator=user,
                workspace=workspace,
                slug=slug
            )
            logger.info(f"Project created: {project.id} - {project.name}")
            
            # Add creator as lead with full permissions
            membership = ProjectMembership.objects.create(
                project=project,
                user=user,
                role=ProjectMembership.Role.LEAD,
                can_view_data=True,
                can_run_analysis=True,
                can_publish_results=True,
                can_manage_connectors=True,
                can_invite_members=True,
                can_execute_pipelines=True,
                can_create_datasets=True,
                can_manage_data_sources=True
            )
            
            logger.info(f"Membership created: {membership.id} - Role: {membership.role}")
            
            # Increment workspace sync version if applicable
            if workspace:
                workspace.increment_sync_version()
            
            # Audit log with IP and user agent
            AuditLog.log_action(
                user=user,
                action='project_created',
                category='project',
                resource_type='project',
                resource_id=project.id,
                details={
                    'name': project.name,
                    'slug': project.slug,
                    'workspace_id': workspace.id if workspace else None,
                    'workspace_name': workspace.name if workspace else None,
                    'visibility': project.visibility
                },
                ip_address=getattr(self.request, 'audit_ip', None),
                user_agent=getattr(self.request, 'audit_user_agent', '')
            )
            
            logger.info(f"Project creation completed successfully")
            
        except Exception as e:
            logger.error(f"Project creation failed: {str(e)}", exc_info=True)
            raise
    
    @action(detail=False, methods=['get'])
    def browse(self, request):
        """
        Browse public and team projects
        Returns projects user can discover and request to join
        """
        user = request.user
        
        logger.info(f"User {user.email} browsing projects")
        
        # Get user's workspaces for team project filtering
        user_workspaces = Workspace.objects.filter(
            Q(owner=user) | Q(workspacemembership__user=user)
        ).values_list('id', flat=True)
        
        # Projects user is NOT a member of
        current_member_projects = Project.objects.filter(
            memberships__user=user
        ).values_list('id', flat=True)
        
        logger.info(f"User is member of {len(current_member_projects)} projects")
        
        # Public projects OR team projects in user's workspaces
        queryset = Project.objects.filter(
            Q(visibility=Project.Visibility.PUBLIC) |
            Q(visibility=Project.Visibility.TEAM, workspace_id__in=user_workspaces)
        ).exclude(
            id__in=current_member_projects
        ).select_related(
            'creator', 'workspace'
        ).prefetch_related(
            'memberships'
        ).annotate(
            member_count=Count('memberships', distinct=True)
        ).order_by('-updated_at')
        
        logger.info(f"Initial queryset count: {queryset.count()}")
        
        # Apply filters
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(tags__contains=[search])
            )
            logger.info(f"Search filter '{search}': {queryset.count()} results")
        
        visibility = request.query_params.get('visibility')
        if visibility in ['public', 'team']:
            queryset = queryset.filter(visibility=visibility)
        
        workspace_id = request.query_params.get('workspace')
        if workspace_id:
            try:
                workspace_id = int(workspace_id)
                queryset = queryset.filter(workspace_id=workspace_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid workspace_id: {workspace_id}")
        
        final_count = queryset.count()
        logger.info(f"Final browse results: {final_count} projects")
        
        # Limit to 50 most recent
        queryset_limited = queryset[:50]
        
        serializer = ProjectListSerializer(
            queryset_limited,
            many=True,
            context={'request': request}
        )
        
        # Calculate recommendations
        recommendations = self._get_project_recommendations(user, list(queryset_limited))
        
        return Response({
            'projects': serializer.data,
            'recommendations': recommendations,
            'total': final_count
        })
    
    def _get_project_recommendations(self, user, available_projects):
        """Calculate project recommendations based on activity and similarity"""
        recommendations = []
        
        # Get user's current project tags
        user_projects = Project.objects.filter(memberships__user=user)
        user_tags = set()
        for project in user_projects:
            if project.tags:
                user_tags.update(project.tags)
        
        for project in available_projects:
            score = 0
            reasons = []
            
            # Same workspace bonus
            if project.workspace:
                try:
                    is_workspace_member = project.workspace.workspacemembership_set.filter(
                        user=user
                    ).exists()
                    if is_workspace_member:
                        score += 10
                        reasons.append(f"In your '{project.workspace.name}' workspace")
                except Exception as e:
                    logger.warning(f"Error checking workspace membership: {e}")
            
            # Tag similarity
            if project.tags and user_tags:
                matching_tags = set(project.tags) & user_tags
                if matching_tags:
                    score += len(matching_tags) * 5
                    reasons.append(f"Similar interests: {', '.join(list(matching_tags)[:3])}")
            
            # Recent activity
            days_since_update = (timezone.now() - project.updated_at).days
            if days_since_update < 7:
                score += 3
                reasons.append("Recently active")
            
            # Popular project
            member_count = getattr(project, 'member_count', 0)
            if member_count > 5:
                score += 2
                reasons.append(f"{member_count} members")
            
            if score > 0:
                recommendations.append({
                    'project_id': project.id,
                    'score': score,
                    'reasons': reasons
                })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:10]
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get project members"""
        project = self.get_object()
        memberships = project.memberships.select_related('user').all()
        serializer = ProjectMembershipSerializer(
            memberships, 
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """
        Send invitation to user (requires user acceptance)
        Aligned with NOVEM's results-first collaboration
        """
        project = self.get_object()
        
        # Check permissions
        membership = project.memberships.filter(user=request.user).first()
        if not membership or not membership.can_invite_members:
            return Response(
                {'error': 'You do not have permission to invite members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        role = request.data.get('role', ProjectMembership.Role.VIEWER)
        message_text = request.data.get('message', '')
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitee = User.objects.get(email=email)
            
            # Check if already a member
            if project.memberships.filter(user=invitee).exists():
                return Response(
                    {'error': 'User is already a member of this project'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check for existing pending invitation
            existing_invitation = ProjectInvitation.objects.filter(
                project=project,
                invitee_email=email,
                status=ProjectInvitation.Status.PENDING
            ).first()
            
            if existing_invitation and not existing_invitation.is_expired():
                return Response(
                    {'error': 'A pending invitation already exists for this user'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create or update invitation
            if existing_invitation and existing_invitation.is_expired():
                logger.info(f"Updating expired invitation {existing_invitation.id}")
                existing_invitation.status = ProjectInvitation.Status.PENDING
                existing_invitation.inviter = request.user
                existing_invitation.role = role
                existing_invitation.message = message_text
                existing_invitation.invited_at = timezone.now()
                existing_invitation.expires_at = timezone.now() + timedelta(days=7)
                existing_invitation.responded_at = None
                existing_invitation.save()
                invitation = existing_invitation
            else:
                invitation = ProjectInvitation.objects.create(
                    project=project,
                    inviter=request.user,
                    invitee_email=email,
                    invitee=invitee,
                    role=role,
                    message=message_text,
                    expires_at=timezone.now() + timedelta(days=7)
                )
            
            # Increment sync version
            project.increment_sync_version()
            
            # Audit log
            AuditLog.log_action(
                user=request.user,
                action='project_invitation_sent',
                category='project',
                resource_type='project',
                resource_id=project.id,
                details={
                    'invitee_email': email,
                    'role': role,
                    'invitation_id': invitation.id
                },
                ip_address=getattr(request, 'audit_ip', None),
                user_agent=getattr(request, 'audit_user_agent', '')
            )
            
            logger.info(f"Invitation sent to {email} for project {project.id}")
            
            return Response({
                'message': f'Invitation sent to {email}. They must accept to join the project.',
                'invitation': ProjectInvitationSerializer(invitation, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found. They need to register first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to send invitation: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to send invitation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    @action(detail=True, methods=['post'], url_path='invitations/(?P<invitation_id>[^/.]+)/accept')
    def accept_invitation(self, request, pk=None, invitation_id=None):
        """Accept a project invitation"""
        project = self.get_object()
        
        invitation = get_object_or_404(
            ProjectInvitation,
            id=invitation_id,
            project=project,
            invitee=request.user,
            status=ProjectInvitation.Status.PENDING
        )
        
        # Check expiry
        if invitation.is_expired():
            invitation.status = ProjectInvitation.Status.EXPIRED
            invitation.responded_at = timezone.now()
            invitation.save(update_fields=['status', 'responded_at'])
            return Response(
                {'error': 'This invitation has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already a member
        existing_membership = project.memberships.filter(user=request.user).first()
        if existing_membership:
            if invitation.status == ProjectInvitation.Status.PENDING:
                invitation.status = ProjectInvitation.Status.ACCEPTED
                invitation.responded_at = timezone.now()
                invitation.save(update_fields=['status', 'responded_at'])
            
            return Response({
                'message': 'You are already a member of this project',
                'membership': ProjectMembershipSerializer(existing_membership, context={'request': request}).data
            })
        
        try:
            # Get role permissions
            permissions = self._get_role_permissions(invitation.role)
            
            # Create membership
            membership = ProjectMembership.objects.create(
                project=project,
                user=request.user,
                role=invitation.role,
                **permissions
            )
            
            # Update invitation
            invitation.status = ProjectInvitation.Status.ACCEPTED
            invitation.responded_at = timezone.now()
            invitation.save(update_fields=['status', 'responded_at'])
            
            # Increment sync version
            project.increment_sync_version()
            
            # Audit log
            AuditLog.log_action(
                user=request.user,
                action='project_invitation_accepted',
                category='project',
                resource_type='project',
                resource_id=project.id,
                details={
                    'invitation_id': invitation.id,
                    'role': invitation.role
                },
                ip_address=getattr(request, 'audit_ip', None),
                user_agent=getattr(request, 'audit_user_agent', '')
            )
            
            logger.info(f"User {request.user.email} accepted invitation to project {project.id}")
            
            return Response({
                'message': 'Invitation accepted successfully',
                'membership': ProjectMembershipSerializer(membership, context={'request': request}).data
            })
            
        except Exception as e:
            logger.error(f"Failed to accept invitation: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to accept invitation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='invitations/(?P<invitation_id>[^/.]+)/decline')
    def decline_invitation(self, request, pk=None, invitation_id=None):
        """Decline a project invitation"""
        project = self.get_object()
        
        invitation = get_object_or_404(
            ProjectInvitation,
            id=invitation_id,
            project=project,
            invitee=request.user,
            status=ProjectInvitation.Status.PENDING
        )
        
        invitation.status = ProjectInvitation.Status.DECLINED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='project_invitation_declined',
            category='project',
            resource_type='project',
            resource_id=project.id,
            details={'invitation_id': invitation.id},
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        logger.info(f"User {request.user.email} declined invitation to project {project.id}")
        
        return Response({'message': 'Invitation declined'})
    
    @action(detail=True, methods=['get'])
    def invitations(self, request, pk=None):
        """Get project invitations (for project leads)"""
        project = self.get_object()
        
        # Check permissions
        membership = project.memberships.filter(user=request.user).first()
        if not membership or not membership.can_invite_members:
            return Response(
                {'error': 'You do not have permission to view invitations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invitations = project.invitations.select_related(
            'inviter', 'invitee'
        ).order_by('-invited_at')
        
        serializer = ProjectInvitationSerializer(
            invitations, 
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_invitations(self, request):
        """Get user's received invitations"""
        invitations = ProjectInvitation.objects.filter(
            invitee=request.user
        ).select_related('project', 'inviter').order_by('-invited_at')
        
        serializer = ProjectInvitationSerializer(
            invitations, 
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def request_join(self, request, pk=None):
        """Request to join a project (requires approval)"""
        project = self.get_object()
        
        # Check if already a member
        if project.memberships.filter(user=request.user).exists():
            return Response(
                {'error': 'You are already a member of this project'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already requested
        existing_request = ProjectJoinRequest.objects.filter(
            project=project,
            user=request.user,
            status=ProjectJoinRequest.Status.PENDING
        ).first()
        
        if existing_request:
            return Response(
                {'error': 'You already have a pending join request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create join request
        join_request = ProjectJoinRequest.objects.create(
            project=project,
            user=request.user,
            message=request.data.get('message', '')
        )
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='project_join_requested',
            category='project',
            resource_type='project',
            resource_id=project.id,
            details={
                'user_id': request.user.id,
                'message': join_request.message
            },
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        return Response(
            ProjectJoinRequestSerializer(join_request, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def join_requests(self, request, pk=None):
        """Get pending join requests"""
        project = self.get_object()
        
        # Check permissions
        membership = project.memberships.filter(user=request.user).first()
        if not membership or not membership.can_invite_members:
            return Response(
                {'error': 'You do not have permission to view join requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        requests_qs = project.join_requests.filter(
            status=ProjectJoinRequest.Status.PENDING
        ).select_related('user')
        
        serializer = ProjectJoinRequestSerializer(
            requests_qs, 
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @transaction.atomic
    @action(detail=True, methods=['post'], url_path='join_requests/(?P<request_id>[^/.]+)/approve')
    def approve_join_request(self, request, pk=None, request_id=None):
        """Approve a join request"""
        project = self.get_object()
        
        # Check permissions
        membership = project.memberships.filter(user=request.user).first()
        if not membership or not membership.can_invite_members:
            return Response(
                {'error': 'You do not have permission to approve join requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        join_request = get_object_or_404(
            ProjectJoinRequest,
            id=request_id,
            project=project,
            status=ProjectJoinRequest.Status.PENDING
        )
        
        # Check if already a member
        if project.memberships.filter(user=join_request.user).exists():
            join_request.status = ProjectJoinRequest.Status.APPROVED
            join_request.reviewed_at = timezone.now()
            join_request.reviewed_by = request.user
            join_request.save()
            return Response({'message': 'User is already a member'})
        
        # Create membership
        role = request.data.get('role', ProjectMembership.Role.VIEWER)
        permissions = self._get_role_permissions(role)
        
        new_membership = ProjectMembership.objects.create(
            project=project,
            user=join_request.user,
            role=role,
            **permissions
        )
        
        # Update request
        join_request.status = ProjectJoinRequest.Status.APPROVED
        join_request.reviewed_at = timezone.now()
        join_request.reviewed_by = request.user
        join_request.save()
        
        # Increment sync version
        project.increment_sync_version()
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='project_join_approved',
            category='project',
            resource_type='project',
            resource_id=project.id,
            details={
                'approved_user_id': join_request.user.id,
                'role': role,
                'request_id': join_request.id
            },
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        return Response({
            'message': 'Join request approved',
            'membership': ProjectMembershipSerializer(new_membership, context={'request': request}).data
        })
    
    @action(detail=True, methods=['post'], url_path='join_requests/(?P<request_id>[^/.]+)/reject')
    def reject_join_request(self, request, pk=None, request_id=None):
        """Reject a join request"""
        project = self.get_object()
        
        # Check permissions
        membership = project.memberships.filter(user=request.user).first()
        if not membership or not membership.can_invite_members:
            return Response(
                {'error': 'You do not have permission to reject join requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        join_request = get_object_or_404(
            ProjectJoinRequest,
            id=request_id,
            project=project,
            status=ProjectJoinRequest.Status.PENDING
        )
        
        join_request.status = ProjectJoinRequest.Status.REJECTED
        join_request.reviewed_at = timezone.now()
        join_request.reviewed_by = request.user
        join_request.save()
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='project_join_rejected',
            category='project',
            resource_type='project',
            resource_id=project.id,
            details={
                'rejected_user_id': join_request.user.id,
                'request_id': join_request.id
            },
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        return Response({'message': 'Join request rejected'})
    
    @action(detail=False, methods=['get'])
    def my_join_requests(self, request):
        """Get user's own join requests"""
        requests_qs = ProjectJoinRequest.objects.filter(
            user=request.user
        ).select_related('project', 'reviewed_by').order_by('-requested_at')
        
        serializer = ProjectJoinRequestSerializer(
            requests_qs, 
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @transaction.atomic
    @action(detail=True, methods=['put'])
    def update_member_role(self, request, pk=None):
        """Update member role and permissions"""
        project = self.get_object()
        user_id = request.data.get('user_id')
        new_role = request.data.get('role')
        
        # Check permissions
        requester_membership = project.memberships.filter(user=request.user).first()
        if not requester_membership or not requester_membership.can_invite_members:
            return Response(
                {'error': 'You do not have permission to update member roles'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        membership = project.memberships.filter(user_id=user_id).first()
        if not membership:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Cannot change creator's role
        if membership.user == project.creator:
            return Response(
                {'error': 'Cannot change project creator role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update role and permissions
        old_role = membership.role
        permissions = self._get_role_permissions(new_role)
        membership.role = new_role
        for key, value in permissions.items():
            setattr(membership, key, value)
        membership.save()
        
        # Increment sync version
        project.increment_sync_version()
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='project_member_role_updated',
            category='project',
            resource_type='project',
            resource_id=project.id,
            details={
                'user_id': user_id,
                'old_role': old_role,
                'new_role': new_role
            },
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        return Response(ProjectMembershipSerializer(membership, context={'request': request}).data)
    
    @transaction.atomic
    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """Remove member from project"""
        project = self.get_object()
        user_id = request.data.get('user_id')
        
        # Check permissions
        requester_membership = project.memberships.filter(user=request.user).first()
        if not requester_membership or not requester_membership.can_invite_members:
            return Response(
                {'error': 'You do not have permission to remove members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Cannot remove creator
        if project.creator_id == user_id:
            return Response(
                {'error': 'Cannot remove project creator'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        membership = project.memberships.filter(user_id=user_id).first()
        if membership:
            removed_email = membership.user.email
            membership.delete()
            
            # Increment sync version
            project.increment_sync_version()
            
            # Audit log
            AuditLog.log_action(
                user=request.user,
                action='project_member_removed',
                category='project',
                resource_type='project',
                resource_id=project.id,
                details={
                    'removed_user_id': user_id,
                    'removed_email': removed_email
                },
                ip_address=getattr(request, 'audit_ip', None),
                user_agent=getattr(request, 'audit_user_agent', '')
            )
            
            return Response({'message': 'Member removed from project'})
        
        return Response(
            {'error': 'Member not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get project statistics"""
        project = self.get_object()
        
        stats = {
            'member_count': project.memberships.count(),
            'dataset_count': 0,  # Placeholder for Phase 6B
            'analysis_count': 0,
            'model_count': 0,
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def sync_status(self, request, pk=None):
        """
        Check sync status for offline mode
        Returns current sync_version and pending changes
        """
        project = self.get_object()
        client_version = request.data.get('client_version', 0)
        
        needs_sync = project.sync_version > client_version
        
        return Response({
            'project_id': project.id,
            'server_version': project.sync_version,
            'client_version': client_version,
            'needs_sync': needs_sync,
            'last_synced': project.last_synced,
        })
    
    def _get_role_permissions(self, role):
        """Get default permissions for a role"""
        permissions_map = {
            ProjectMembership.Role.VIEWER: {
                'can_view_data': True,
                'can_run_analysis': False,
                'can_publish_results': False,
                'can_manage_connectors': False,
                'can_invite_members': False,
                'can_execute_pipelines': False,
                'can_create_datasets': False,
                'can_manage_data_sources': False,
            },
            ProjectMembership.Role.ANALYST: {
                'can_view_data': True,
                'can_run_analysis': True,
                'can_publish_results': False,
                'can_manage_connectors': False,
                'can_invite_members': False,
                'can_execute_pipelines': True,
                'can_create_datasets': False,
                'can_manage_data_sources': False,
            },
            ProjectMembership.Role.CONTRIBUTOR: {
                'can_view_data': True,
                'can_run_analysis': True,
                'can_publish_results': True,
                'can_manage_connectors': True,
                'can_invite_members': False,
                'can_execute_pipelines': True,
                'can_create_datasets': True,
                'can_manage_data_sources': True,
            },
            ProjectMembership.Role.LEAD: {
                'can_view_data': True,
                'can_run_analysis': True,
                'can_publish_results': True,
                'can_manage_connectors': True,
                'can_invite_members': True,
                'can_execute_pipelines': True,
                'can_create_datasets': True,
                'can_manage_data_sources': True,
            },
        }
        return permissions_map.get(role, permissions_map[ProjectMembership.Role.VIEWER])

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    