from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.text import slugify
from django.utils import timezone
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.db import transaction
from datetime import timedelta
import logging

from .models import Workspace, WorkspaceMembership, WorkspaceInvitation, WorkspaceJoinRequest
from .serializers import (
    WorkspaceListSerializer, WorkspaceDetailSerializer,
    WorkspaceCreateSerializer, WorkspaceMembershipSerializer,
    WorkspaceInvitationSerializer, WorkspaceJoinRequestSerializer
)
from accounts.models import User
from audit.models import AuditLog

logger = logging.getLogger(__name__)


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    Workspace management with offline sync support
    Workspaces are ownership boundaries in NOVEM's local-first architecture
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return WorkspaceCreateSerializer
        elif self.action == 'retrieve':
            return WorkspaceDetailSerializer
        elif self.action in ['list', 'browse']:
            return WorkspaceListSerializer
        elif self.action == 'partial_update':
            return WorkspaceCreateSerializer
        return WorkspaceListSerializer
    
    def get_queryset(self):
        """
        Return workspaces where user is a member or owner
        """
        user = self.request.user
        
        logger.info(f"Retrieving workspaces for user: {user.email} (ID: {user.id})")
        
        # Get workspaces where user is owner OR a member
        queryset = Workspace.objects.filter(
            Q(owner=user) | Q(workspacemembership__user=user)
        ).distinct().select_related('owner').prefetch_related(
            'workspacemembership_set',
            'workspacemembership_set__user'
        )
        
        count = queryset.count()
        logger.info(f"Found {count} workspaces for user {user.email}")
        
        return queryset
    
    def get_serializer_context(self):
        """Ensure request is always in serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def list(self, request, *args, **kwargs):
        """List user's workspaces with enhanced logging"""
        logger.info(f"Listing workspaces for: {request.user.email}")
        
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"Successfully serialized {len(serializer.data)} workspaces")
            
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Failed to list workspaces: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to load workspaces: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create workspace with auto-onboarding for first-time users
        Aligned with NOVEM's lifecycle: REGISTERED -> ACTIVE
        """
        user = self.request.user
        
        logger.info(f"Creating workspace for user: {user.email}")
        logger.info(f"Validated data: {serializer.validated_data}")
        
        # Generate unique slug
        base_slug = slugify(serializer.validated_data['name'])
        slug = base_slug
        counter = 1
        
        while Workspace.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        logger.info(f"Generated slug: {slug}")
        
        try:
            workspace = serializer.save(owner=user, slug=slug)
            logger.info(f"Workspace created: {workspace.id} - {workspace.name}")
            
            # Add creator as owner with full permissions
            membership = WorkspaceMembership.objects.create(
                workspace=workspace,
                user=user,
                role=WorkspaceMembership.Role.OWNER,
                can_create_projects=True,
                can_invite_members=True,
                can_manage_settings=True
            )
            
            logger.info(f"Membership created: {membership.id} - Role: {membership.role}")
            
            # Complete onboarding if this is first workspace (REGISTERED -> ACTIVE)
            if user.account_state == User.AccountState.REGISTERED:
                user.account_state = User.AccountState.ACTIVE
                user.save(update_fields=['account_state'])
                logger.info(f"User onboarded via workspace creation: {user.email}")
            
            # Audit log with IP and user agent
            AuditLog.log_action(
                user=user,
                action='workspace_created',
                category='workspace',
                resource_type='workspace',
                resource_id=workspace.id,
                details={
                    'name': workspace.name,
                    'workspace_type': workspace.workspace_type,
                    'visibility': workspace.visibility,
                    'onboarding_completed': user.account_state == User.AccountState.ACTIVE
                },
                ip_address=getattr(self.request, 'audit_ip', None),
                user_agent=getattr(self.request, 'audit_user_agent', '')
            )
            
            logger.info(f"Workspace creation completed successfully")
            
        except Exception as e:
            logger.error(f"Workspace creation failed: {str(e)}", exc_info=True)
            raise
    
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """Handle partial updates (PATCH) for avatar uploads and settings"""
        workspace = self.get_object()
        
        logger.info(f"Partial update for workspace: {workspace.name}")
        
        # Check permissions
        membership = workspace.workspacemembership_set.filter(user=request.user).first()
        is_owner = workspace.owner == request.user
        can_manage = is_owner or (membership and membership.can_manage_settings)
        
        if not can_manage:
            return Response(
                {'error': 'Only workspace owners/admins can update settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        updated_fields = []
        
        # Handle file upload
        if 'avatar' in request.FILES:
            workspace.avatar = request.FILES['avatar']
            updated_fields.append('avatar')
            logger.info(f"Avatar updated for workspace: {workspace.name}")
        
        # Handle other field updates
        for field in ['name', 'description', 'workspace_type', 'visibility', 'website', 
                      'default_project_visibility', 'allow_member_project_creation', 
                      'require_join_approval']:
            if field in request.data:
                setattr(workspace, field, request.data[field])
                updated_fields.append(field)
        
        workspace.save()
        workspace.increment_sync_version()
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='workspace_updated',
            category='workspace',
            resource_type='workspace',
            resource_id=workspace.id,
            details={'updated_fields': updated_fields},
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        serializer = self.get_serializer(workspace)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='invite-member')
    def invite_member(self, request, pk=None):
        """
        Send workspace invitation
        Supports NOVEM's results-first collaboration model
        """
        workspace = self.get_object()
        
        # Check permissions
        membership = workspace.workspacemembership_set.filter(user=request.user).first()
        is_owner = workspace.owner == request.user
        
        if not is_owner and (not membership or not membership.can_invite_members):
            return Response(
                {'error': 'You do not have permission to invite members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        role = request.data.get('role', WorkspaceMembership.Role.MEMBER)
        message_text = request.data.get('message', '')
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitee = User.objects.get(email=email)
            
            # Check if already a member
            if workspace.workspacemembership_set.filter(user=invitee).exists():
                return Response(
                    {'error': 'User is already a workspace member'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check for existing pending invitation
            existing = WorkspaceInvitation.objects.filter(
                workspace=workspace,
                invitee_email=email,
                status=WorkspaceInvitation.Status.PENDING
            ).first()
            
            if existing and not existing.is_expired():
                return Response(
                    {'error': 'An invitation is already pending for this user'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create invitation
            invitation = WorkspaceInvitation.objects.create(
                workspace=workspace,
                inviter=request.user,
                invitee_email=email,
                invitee=invitee,
                role=role,
                message=message_text,
                expires_at=timezone.now() + timedelta(days=7)
            )
            
            # Audit log
            AuditLog.log_action(
                user=request.user,
                action='workspace_invitation_sent',
                category='workspace',
                resource_type='workspace',
                resource_id=workspace.id,
                details={'invitee_email': email, 'role': role},
                ip_address=getattr(request, 'audit_ip', None),
                user_agent=getattr(request, 'audit_user_agent', '')
            )
            
            logger.info(f"Workspace invitation sent: {email} to {workspace.name}")
            
            return Response(
                WorkspaceInvitationSerializer(invitation, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found. They need to register first.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='my-invitations')
    def my_invitations(self, request):
        """Get user's pending workspace invitations"""
        invitations = WorkspaceInvitation.objects.filter(
            invitee=request.user,
            status=WorkspaceInvitation.Status.PENDING
        ).select_related('workspace', 'inviter').order_by('-invited_at')
        
        serializer = WorkspaceInvitationSerializer(invitations, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='invitations')
    def get_invitations(self, request, pk=None):
        """Get all workspace invitations (admin/owner only)"""
        workspace = self.get_object()
        
        # Check permissions
        membership = workspace.workspacemembership_set.filter(user=request.user).first()
        is_owner = workspace.owner == request.user
        is_admin = membership and membership.role in ['owner', 'admin']
        
        if not (is_owner or is_admin):
            return Response(
                {'error': 'Only workspace owners/admins can view invitations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invitations = WorkspaceInvitation.objects.filter(
            workspace=workspace,
            status=WorkspaceInvitation.Status.PENDING
        ).select_related('inviter', 'invitee').order_by('-invited_at')
        
        serializer = WorkspaceInvitationSerializer(
            invitations,
            many=True,
            context={'request': request}
        )
        
        logger.info(f"Found {len(serializer.data)} pending invitations for workspace {workspace.name}")
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='invitations/(?P<invitation_id>[^/.]+)/cancel')
    def cancel_invitation(self, request, pk=None, invitation_id=None):
        """Cancel a workspace invitation (admin/owner only)"""
        workspace = self.get_object()
        
        # Check permissions
        membership = workspace.workspacemembership_set.filter(user=request.user).first()
        is_owner = workspace.owner == request.user
        is_admin = membership and membership.role in ['owner', 'admin']
        
        if not (is_owner or is_admin):
            return Response(
                {'error': 'Only workspace owners/admins can cancel invitations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invitation = get_object_or_404(
            WorkspaceInvitation,
            id=invitation_id,
            workspace=workspace,
            status=WorkspaceInvitation.Status.PENDING
        )
        
        invitation.status = WorkspaceInvitation.Status.DECLINED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='workspace_invitation_cancelled',
            category='workspace',
            resource_type='workspace',
            resource_id=workspace.id,
            details={'invitation_id': invitation.id, 'invitee_email': invitation.invitee_email},
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        logger.info(f"Workspace invitation cancelled: {invitation.invitee_email} for {workspace.name}")
        
        return Response({'message': 'Invitation cancelled'})
    
    @transaction.atomic
    @action(detail=True, methods=['post'], url_path='invitations/(?P<invitation_id>[^/.]+)/accept')
    def accept_invitation(self, request, pk=None, invitation_id=None):
        """Accept workspace invitation"""
        # Get workspace directly to bypass membership filtering
        try:
            workspace = Workspace.objects.get(pk=pk)
        except Workspace.DoesNotExist:
            return Response(
                {'error': 'Workspace not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        invitation = get_object_or_404(
            WorkspaceInvitation,
            id=invitation_id,
            workspace=workspace,
            invitee=request.user,
            status=WorkspaceInvitation.Status.PENDING
        )
        
        # Check expiry
        if invitation.is_expired():
            invitation.status = WorkspaceInvitation.Status.EXPIRED
            invitation.responded_at = timezone.now()
            invitation.save(update_fields=['status', 'responded_at'])
            return Response(
                {'error': 'This invitation has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already a member
        existing_membership = workspace.workspacemembership_set.filter(user=request.user).first()
        if existing_membership:
            invitation.status = WorkspaceInvitation.Status.ACCEPTED
            invitation.responded_at = timezone.now()
            invitation.save(update_fields=['status', 'responded_at'])
            return Response({
                'message': 'You are already a member of this workspace',
                'membership': WorkspaceMembershipSerializer(existing_membership, context={'request': request}).data
            })
        
        try:
            # Create membership
            membership = WorkspaceMembership.objects.create(
                workspace=workspace,
                user=request.user,
                role=invitation.role,
                invited_by=invitation.inviter,
                can_create_projects=workspace.allow_member_project_creation,
                can_invite_members=(invitation.role in ['owner', 'admin']),
                can_manage_settings=(invitation.role in ['owner', 'admin'])
            )
            
            # Update invitation
            invitation.status = WorkspaceInvitation.Status.ACCEPTED
            invitation.responded_at = timezone.now()
            invitation.save(update_fields=['status', 'responded_at'])
            
            # Increment sync version
            workspace.increment_sync_version()
            
            # Audit log
            AuditLog.log_action(
                user=request.user,
                action='workspace_invitation_accepted',
                category='workspace',
                resource_type='workspace',
                resource_id=workspace.id,
                details={'invitation_id': invitation.id, 'role': invitation.role},
                ip_address=getattr(request, 'audit_ip', None),
                user_agent=getattr(request, 'audit_user_agent', '')
            )
            
            logger.info(f"Workspace invitation accepted: {request.user.email} joined {workspace.name}")
            
            return Response({
                'message': 'Invitation accepted successfully',
                'membership': WorkspaceMembershipSerializer(membership, context={'request': request}).data
            })
            
        except Exception as e:
            logger.error(f"Failed to accept workspace invitation: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to accept invitation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='invitations/(?P<invitation_id>[^/.]+)/decline')
    def decline_invitation(self, request, pk=None, invitation_id=None):
        """Decline workspace invitation"""
        try:
            workspace = Workspace.objects.get(pk=pk)
        except Workspace.DoesNotExist:
            return Response(
                {'error': 'Workspace not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        invitation = get_object_or_404(
            WorkspaceInvitation,
            id=invitation_id,
            workspace=workspace,
            invitee=request.user,
            status=WorkspaceInvitation.Status.PENDING
        )
        
        invitation.status = WorkspaceInvitation.Status.DECLINED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='workspace_invitation_declined',
            category='workspace',
            resource_type='workspace',
            resource_id=workspace.id,
            details={'invitation_id': invitation.id},
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        logger.info(f"Workspace invitation declined: {request.user.email} declined {workspace.name}")
        
        return Response({'message': 'Invitation declined'})
    
    @action(detail=True, methods=['delete'], url_path='remove-member')
    def remove_member(self, request, pk=None):
        """Remove member from workspace"""
        workspace = self.get_object()
        user_id = request.data.get('user_id')
        
        # Check permissions
        is_owner = workspace.owner == request.user
        requester_membership = workspace.workspacemembership_set.filter(user=request.user).first()
        
        if not is_owner and (not requester_membership or requester_membership.role not in ['owner', 'admin']):
            return Response(
                {'error': 'Only workspace owners/admins can remove members'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Cannot remove owner
        if workspace.owner_id == user_id:
            return Response(
                {'error': 'Cannot remove workspace owner'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        membership = workspace.workspacemembership_set.filter(user_id=user_id).first()
        if membership:
            removed_email = membership.user.email
            membership.delete()
            workspace.increment_sync_version()
            
            # Audit log
            AuditLog.log_action(
                user=request.user,
                action='workspace_member_removed',
                category='workspace',
                resource_type='workspace',
                resource_id=workspace.id,
                details={'removed_user_id': user_id, 'removed_email': removed_email},
                ip_address=getattr(request, 'audit_ip', None),
                user_agent=getattr(request, 'audit_user_agent', '')
            )
            
            return Response({'message': 'Member removed from workspace'})
        
        return Response(
            {'error': 'Member not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'])
    def sync_status(self, request, pk=None):
        """
        Check sync status for offline mode
        Returns current sync_version and pending changes
        """
        workspace = self.get_object()
        client_version = request.data.get('client_version', 0)
        
        needs_sync = workspace.sync_version > client_version
        
        return Response({
            'workspace_id': workspace.id,
            'server_version': workspace.sync_version,
            'client_version': client_version,
            'needs_sync': needs_sync,
            'last_synced': workspace.last_synced,
        })
    
    @action(detail=True, methods=['post'], url_path='request-join')
    def request_join(self, request, pk=None):
        """Request to join a workspace (for public/internal workspaces)"""
        try:
            workspace = Workspace.objects.select_related('owner').get(pk=pk)
        except Workspace.DoesNotExist:
            return Response(
                {'error': 'Workspace not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        user = request.user
        
        # Check visibility
        if workspace.visibility == Workspace.Visibility.PRIVATE:
            return Response(
                {'error': 'This workspace is private and does not accept join requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already a member
        if workspace.workspacemembership_set.filter(user=user).exists():
            return Response(
                {'error': 'You are already a member of this workspace'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is the owner
        if workspace.owner == user:
            return Response(
                {'error': 'You are the owner of this workspace'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for existing pending request
        existing_request = WorkspaceJoinRequest.objects.filter(
            workspace=workspace,
            user=user,
            status=WorkspaceJoinRequest.Status.PENDING
        ).first()
        
        if existing_request:
            return Response(
                {'error': 'You already have a pending join request for this workspace'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create join request
        message_text = request.data.get('message', '')
        join_request = WorkspaceJoinRequest.objects.create(
            workspace=workspace,
            user=user,
            message=message_text
        )
        
        # Audit log
        AuditLog.log_action(
            user=user,
            action='workspace_join_requested',
            category='workspace',
            resource_type='workspace',
            resource_id=workspace.id,
            details={'join_request_id': join_request.id},
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        logger.info(f"Join request created: {user.email} for workspace {workspace.name}")
        
        return Response(
            WorkspaceJoinRequestSerializer(join_request, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'], url_path='join-requests')
    def join_requests(self, request, pk=None):
        """Get all pending join requests for a workspace (admin/owner only)"""
        workspace = self.get_object()
        
        # Check permissions
        membership = workspace.workspacemembership_set.filter(user=request.user).first()
        is_owner = workspace.owner == request.user
        is_admin = membership and membership.role in ['owner', 'admin']
        
        if not (is_owner or is_admin):
            return Response(
                {'error': 'Only workspace owners/admins can view join requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        requests_qs = WorkspaceJoinRequest.objects.filter(
            workspace=workspace,
            status=WorkspaceJoinRequest.Status.PENDING
        ).select_related('user').order_by('-created_at')
        
        serializer = WorkspaceJoinRequestSerializer(
            requests_qs,
            many=True,
            context={'request': request}
        )
        
        return Response(serializer.data)
    
    @transaction.atomic
    @action(detail=True, methods=['post'], url_path='join-requests/(?P<request_id>[^/.]+)/approve')
    def approve_join_request(self, request, pk=None, request_id=None):
        """Approve a workspace join request (admin/owner only)"""
        workspace = self.get_object()
        
        # Check permissions
        membership = workspace.workspacemembership_set.filter(user=request.user).first()
        is_owner = workspace.owner == request.user
        is_admin = membership and membership.role in ['owner', 'admin']
        
        if not (is_owner or is_admin):
            return Response(
                {'error': 'Only workspace owners/admins can approve join requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        join_request = get_object_or_404(
            WorkspaceJoinRequest,
            id=request_id,
            workspace=workspace,
            status=WorkspaceJoinRequest.Status.PENDING
        )
        
        # Check if user is already a member
        if workspace.workspacemembership_set.filter(user=join_request.user).exists():
            join_request.status = WorkspaceJoinRequest.Status.APPROVED
            join_request.reviewed_at = timezone.now()
            join_request.reviewed_by = request.user
            join_request.save()
            
            return Response({
                'message': 'User is already a member of this workspace'
            })
        
        # Get role from request data (default to member)
        role = request.data.get('role', WorkspaceMembership.Role.MEMBER)
        
        try:
            # Create membership
            new_membership = WorkspaceMembership.objects.create(
                workspace=workspace,
                user=join_request.user,
                role=role,
                invited_by=request.user,
                can_create_projects=workspace.allow_member_project_creation,
                can_invite_members=(role in ['owner', 'admin']),
                can_manage_settings=(role in ['owner', 'admin'])
            )
            
            # Update join request
            join_request.status = WorkspaceJoinRequest.Status.APPROVED
            join_request.reviewed_at = timezone.now()
            join_request.reviewed_by = request.user
            join_request.save()
            
            # Increment sync version
            workspace.increment_sync_version()
            
            # Audit log
            AuditLog.log_action(
                user=request.user,
                action='workspace_join_request_approved',
                category='workspace',
                resource_type='workspace',
                resource_id=workspace.id,
                details={
                    'join_request_id': join_request.id,
                    'approved_user_id': join_request.user.id,
                    'approved_email': join_request.user.email,
                    'role': role
                },
                ip_address=getattr(request, 'audit_ip', None),
                user_agent=getattr(request, 'audit_user_agent', '')
            )
            
            logger.info(f"Join request approved: {join_request.user.email} joined {workspace.name}")
            
            return Response({
                'message': 'Join request approved successfully',
                'membership': WorkspaceMembershipSerializer(new_membership, context={'request': request}).data
            })
            
        except Exception as e:
            logger.error(f"Failed to approve join request: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to approve join request: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='join-requests/(?P<request_id>[^/.]+)/reject')
    def reject_join_request(self, request, pk=None, request_id=None):
        """Reject a workspace join request (admin/owner only)"""
        workspace = self.get_object()
        
        # Check permissions
        membership = workspace.workspacemembership_set.filter(user=request.user).first()
        is_owner = workspace.owner == request.user
        is_admin = membership and membership.role in ['owner', 'admin']
        
        if not (is_owner or is_admin):
            return Response(
                {'error': 'Only workspace owners/admins can reject join requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        join_request = get_object_or_404(
            WorkspaceJoinRequest,
            id=request_id,
            workspace=workspace,
            status=WorkspaceJoinRequest.Status.PENDING
        )
        
        join_request.status = WorkspaceJoinRequest.Status.REJECTED
        join_request.reviewed_at = timezone.now()
        join_request.reviewed_by = request.user
        join_request.save()
        
        # Audit log
        AuditLog.log_action(
            user=request.user,
            action='workspace_join_request_rejected',
            category='workspace',
            resource_type='workspace',
            resource_id=workspace.id,
            details={
                'join_request_id': join_request.id,
                'rejected_user_id': join_request.user.id,
                'rejected_email': join_request.user.email
            },
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', '')
        )
        
        logger.info(f"Join request rejected: {join_request.user.email} for workspace {workspace.name}")
        
        return Response({
            'message': 'Join request rejected'
        })
    
    @action(detail=False, methods=['get'], url_path='my-join-requests')
    def my_join_requests(self, request):
        """Get current user's workspace join requests"""
        requests_qs = WorkspaceJoinRequest.objects.filter(
            user=request.user
        ).select_related('workspace', 'workspace__owner', 'reviewed_by').order_by('-created_at')
        
        serializer = WorkspaceJoinRequestSerializer(
            requests_qs,
            many=True,
            context={'request': request}
        )
        
        logger.info(f"User {request.user.email} has {len(serializer.data)} workspace join requests")
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def browse(self, request):
        """
        Browse discoverable workspaces
        Returns public/internal workspaces user can request to join
        """
        user = request.user
        
        # Workspaces user is NOT a member of
        current_member_workspaces = Workspace.objects.filter(
            Q(owner=user) | Q(workspacemembership__user=user)
        ).values_list('id', flat=True)
        
        # Only public and internal workspaces
        queryset = Workspace.objects.filter(
            visibility__in=[Workspace.Visibility.PUBLIC, Workspace.Visibility.INTERNAL]
        ).exclude(
            id__in=current_member_workspaces
        ).select_related('owner').prefetch_related(
            'workspacemembership_set'
        ).annotate(
            member_count=Count('workspacemembership', distinct=True),
            project_count=Count('projects', distinct=True)
        ).order_by('-updated_at')[:50]
        
        # Search filter
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        # Type filter
        workspace_type = request.query_params.get('type')
        if workspace_type:
            queryset = queryset.filter(workspace_type=workspace_type)
        
        serializer = WorkspaceListSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        
        # Calculate recommendations
        recommendations = self._get_workspace_recommendations(user, queryset)
        
        return Response({
            'workspaces': serializer.data,
            'recommendations': recommendations,
            'total': queryset.count()
        })
    
    def _get_workspace_recommendations(self, user, available_workspaces):
        """Calculate workspace recommendations based on activity and team size"""
        recommendations = []
        
        for workspace in available_workspaces:
            score = 0
            reasons = []
            
            # Active workspace
            if hasattr(workspace, 'project_count') and workspace.project_count > 0:
                score += workspace.project_count * 2
                reasons.append(f"{workspace.project_count} active projects")
            
            # Good team size
            if hasattr(workspace, 'member_count'):
                if 3 <= workspace.member_count <= 20:
                    score += 5
                    reasons.append(f"{workspace.member_count} members")
            
            # Recent activity
            days_since_update = (timezone.now() - workspace.updated_at).days
            if days_since_update < 7:
                score += 3
                reasons.append("Recently active")
            
            # Organization workspace (more structured)
            if workspace.workspace_type == Workspace.WorkspaceType.ORGANIZATION:
                score += 2
                reasons.append("Organization workspace")
            
            if score > 0:
                recommendations.append({
                    'workspace_id': workspace.id,
                    'score': score,
                    'reasons': reasons
                })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:10]
    
