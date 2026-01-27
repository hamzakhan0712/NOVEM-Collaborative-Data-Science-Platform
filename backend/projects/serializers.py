from workspaces.serializers import WorkspaceDetailSerializer
from rest_framework import serializers
from .models import ProjectInvitation, Project, ProjectMembership, ProjectJoinRequest
from accounts.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class ProjectListSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    member_count = serializers.SerializerMethodField()
    dataset_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()
    current_user_permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'slug', 'description', 'workspace', 'workspace_name',
                  'creator', 'visibility', 'tags', 'member_count', 'dataset_count',
                  'created_at', 'updated_at', 'current_user_role', 'current_user_permissions']
        read_only_fields = ['id', 'slug', 'creator', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.memberships.count()
    
    def get_dataset_count(self, obj):
        try:
            return obj.datasets.count()
        except AttributeError:
            return 0
    
    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user).first()
            return membership.role if membership else None
        return None
    
    def get_current_user_permissions(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user).first()
            if membership:
                return {
                    'can_view_data': membership.can_view_data,
                    'can_run_analysis': membership.can_run_analysis,
                    'can_publish_results': membership.can_publish_results,
                    'can_manage_connectors': membership.can_manage_connectors,
                    'can_invite_members': membership.can_invite_members,
                }
        return None


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False)
    
    class Meta:
        model = ProjectMembership
        fields = ['id', 'user', 'user_email', 'role', 'can_view_data', 
                  'can_run_analysis', 'can_publish_results', 
                  'can_manage_connectors', 'can_invite_members', 'joined_at']
        read_only_fields = ['id', 'user', 'joined_at']


class ProjectInvitationSerializer(serializers.ModelSerializer):
    inviter = UserSerializer(read_only=True)
    invitee = UserSerializer(read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectInvitation
        fields = ['id', 'project', 'project_name', 'inviter', 'invitee_email', 
                  'invitee', 'role', 'message', 'status', 'invited_at', 
                  'responded_at', 'expires_at', 'is_expired']
        read_only_fields = ['id', 'inviter', 'invitee', 'status', 'invited_at', 
                            'responded_at']
    
    def get_is_expired(self, obj):
        return obj.is_expired()

class ProjectJoinRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.email', read_only=True)
    
    class Meta:
        model = ProjectJoinRequest
        fields = ['id', 'project', 'project_name', 'user', 'message', 'status', 
                  'requested_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_name']
        read_only_fields = ['id', 'user', 'status', 'requested_at', 'reviewed_at', 'reviewed_by']

class ProjectDetailSerializer(ProjectListSerializer):
    memberships = ProjectMembershipSerializer(many=True, read_only=True)
    workspace = WorkspaceDetailSerializer(read_only=True)
    
    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + ['memberships', 'workspace']

class ProjectCreateSerializer(serializers.ModelSerializer):
    workspace_id = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = Project
        fields = ['name', 'description', 'workspace_id', 'visibility', 'tags']