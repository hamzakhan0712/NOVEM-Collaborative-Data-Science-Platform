
from audit.models import AuditLog
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from .serializers import (
    RegisterSerializer, LoginSerializer, 
    UserSerializer, ProfileSerializer, UpdateProfileSerializer
)
from .models import User, Profile
import logging
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    """User registration"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        logger.info(f"New user registered: {user.email}")
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    """User login with enhanced error handling"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        user = authenticate(email=email, password=password)
        
        if user is None:
            logger.warning(f"Failed login attempt for: {email}")
            return Response(
                {'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if user.account_state == User.AccountState.SUSPENDED:
            logger.warning(f"Suspended account login attempt: {email}")
            return Response(
                {'detail': 'Your account has been suspended. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update last sync
        user.last_sync = timezone.now()
        user.save(update_fields=['last_sync'])
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        logger.info(f"User logged in: {email}")
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

class LogoutView(APIView):
    """User logout with token blacklisting"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                logger.info(f"User logged out: {request.user.email}")
            return Response({'message': 'Logout successful'})
        except TokenError as e:
            logger.error(f"Token blacklist error: {str(e)}")
            return Response(
                {'error': 'Invalid token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return Response(
                {'error': 'Logout failed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get current user profile"""
    return Response(UserSerializer(request.user).data)

class ProfileView(generics.RetrieveAPIView):
    """Get detailed user profile"""
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user.profile

class UpdateProfileView(generics.UpdateAPIView):
    """Update user profile"""
    serializer_class = UpdateProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user.profile
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        logger.info(f"Profile updated: {request.user.email}")
        
        return Response({
            'user': UserSerializer(request.user).data,
            'profile': ProfileSerializer(instance).data
        })

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings


# ...existing code...

class PasswordResetRequestView(APIView):
    """Request password reset"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Construct reset URL
            reset_url = f"{settings.FRONTEND_URL}/password-reset/confirm?uid={uid}&token={token}"
            
            # Display email in console for development
            print("\n" + "="*80)
            print("PASSWORD RESET EMAIL")
            print("="*80)
            print(f"To: {email}")
            print(f"Subject: Reset Your NOVEM Password")
            print("-"*80)
            print(f"Hello {user.first_name or user.username},")
            print()
            print("You requested to reset your password for your NOVEM account.")
            print()
            print("Click the link below to reset your password:")
            print(reset_url)
            print()
            print("This link will expire in 1 hour.")
            print()
            print("If you didn't request this, please ignore this email.")
            print()
            print("Best regards,")
            print("The NOVEM Team")
            print("="*80 + "\n")
            
            logger.info(f"Password reset requested for: {email}")
            logger.info(f"Reset URL: {reset_url}")
            
            return Response({
                'message': 'Password reset email sent',
                'uid': uid,
                'token': token,
                'reset_url': reset_url  # Include in response for development
            })
            
        except User.DoesNotExist:
            # Return same message to prevent user enumeration
            logger.warning(f"Password reset attempted for non-existent email: {email}")
            return Response({
                'message': 'If the email exists, a reset link has been sent'
            })

# ...existing code...

# ...existing code...

class PasswordResetConfirmView(APIView):
    """Confirm password reset"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not all([uid, token, new_password]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                
                # Log success in console
                print("\n" + "="*80)
                print("PASSWORD RESET SUCCESSFUL")
                print("="*80)
                print(f"User: {user.email}")
                print(f"Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print("="*80 + "\n")
                
                logger.info(f"Password reset completed for: {user.email}")
                return Response({'message': 'Password reset successful'})
            else:
                logger.warning(f"Invalid/expired token for password reset: {user.email}")
                return Response(
                    {'error': 'Invalid or expired token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except (User.DoesNotExist, ValueError, TypeError) as e:
            logger.error(f"Password reset error: {str(e)}")
            return Response(
                {'error': 'Invalid reset link'},
                status=status.HTTP_400_BAD_REQUEST
            )

# ...existing code...

class CompleteOnboardingView(APIView):
    """Complete user onboarding"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.account_state == User.AccountState.ACTIVE:
            return Response({
                'message': 'Onboarding already completed',
                'user': UserSerializer(user).data
            })
        
        if user.account_state == User.AccountState.SUSPENDED:
            return Response(
                {'error': 'Account is suspended'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.account_state = User.AccountState.ACTIVE
        user.save(update_fields=['account_state'])
        
        logger.info(f"Onboarding completed for: {user.email}")
        
        return Response({
            'message': 'Onboarding completed successfully',
            'user': UserSerializer(user).data
        })

class GoogleAuthView(APIView):
    """Google OAuth authentication"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        credential = request.data.get('credential')
        
        if not credential:
            return Response(
                {'detail': 'No credential provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify the Google token
            idinfo = id_token.verify_oauth2_token(
                credential, 
                google_requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            
            # Extract user info
            email = idinfo.get('email')
            google_id = idinfo.get('sub')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            profile_picture = idinfo.get('picture', '')
            
            if not email:
                return Response(
                    {'detail': 'Email not provided by Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'google_id': google_id,
                    'first_name': first_name,
                    'last_name': last_name,
                    'profile_picture': profile_picture,
                    'account_state': User.AccountState.REGISTERED,
                }
            )
            
            # Update existing user's Google info
            if not created:
                user.google_id = google_id
                if profile_picture:
                    user.profile_picture = profile_picture
                user.save()
            else:
                # Create profile for new user
                Profile.objects.create(user=user)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Log the authentication
            AuditLog.objects.create(
                user=user,
                action='google_login',
                resource_type='user',
                resource_id=user.id,
                details={'email': email, 'new_user': created}
            )
            
            logger.info(f"Google auth successful: {email} (new={created})")
            
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            logger.error(f"Google token verification failed: {e}")
            return Response(
                {'detail': 'Invalid Google token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Google auth error: {e}")
            return Response(
                {'detail': 'Authentication failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Simple health check endpoint for connectivity testing
    Returns 200 OK if backend is reachable
    """
    return Response({
        'status': 'ok',
        'timestamp': timezone.now().isoformat(),
        'service': 'NOVEM Backend API'
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user"""
    return Response(UserSerializer(request.user).data)