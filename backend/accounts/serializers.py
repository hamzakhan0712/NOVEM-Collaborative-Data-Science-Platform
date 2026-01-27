from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    is_onboarding_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 
                  'account_state', 'profile_picture', 'is_onboarding_complete',
                  'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_is_onboarding_complete(self, obj):
        """Check if user has completed onboarding"""
        return obj.account_state == User.AccountState.ACTIVE

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Profile
        fields = ['user', 'bio', 'organization', 'job_title', 'location', 
                  'website', 'theme', 'email_notifications']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 
                  'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        # Set initial state to REGISTERED (needs onboarding)
        user = User.objects.create_user(
            **validated_data,
            account_state=User.AccountState.REGISTERED
        )
        # Create profile
        Profile.objects.create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating profile"""
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Profile
        fields = ['bio', 'organization', 'job_title', 'location', 
                  'website', 'theme', 'email_notifications',
                  'first_name', 'last_name']
    
    def update(self, instance, validated_data):
        # Update user fields if provided
        user = instance.user
        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        user.save()
        
        # Update profile fields
        return super().update(instance, validated_data)