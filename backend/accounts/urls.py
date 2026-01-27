from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
     
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    
    # JWT Token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile - Simple endpoint for session check
    path('profile/', views.get_profile, name='profile'),
    
    # Profile - Detailed endpoints
    path('profile/detail/', views.ProfileView.as_view(), name='profile_detail'),
    path('profile/update/', views.UpdateProfileView.as_view(), name='update_profile'),
    
    # Current user (alternative)
    path('me/', views.current_user, name='current_user'),
    
    # Password Reset
    path('password-reset/', views.PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # Onboarding
    path('onboarding/complete/', views.CompleteOnboardingView.as_view(), name='complete_onboarding'),
    
    # Google OAuth
    path('google/', views.GoogleAuthView.as_view(), name='google_auth'),
]