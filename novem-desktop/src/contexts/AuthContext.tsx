import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { backendAPI } from '../services/api';
import { message } from 'antd';
import { offlineManager } from '../services/offline';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_onboarding_complete: boolean;
  account_state: string;
  profile_picture?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  loading: boolean;
  isOnline: boolean;
  offlineMode: boolean;
  graceExpiry: Date | null;
  daysRemaining: number;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  completeOnboarding: () => Promise<void>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);
  const [graceExpiry, setGraceExpiry] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(7);
  const isInitialized = useRef(false);
  const connectivityCheckInterval = useRef<number | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    initAuth();
  }, []);

  const initAuth = async () => {
    console.log('🔐 Initializing authentication...');
    
    try {
      // Check if we have tokens
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const cachedUser = localStorage.getItem('user_cache');

      if (!accessToken || !refreshToken) {
        console.log('❌ No tokens found');
        setLoading(false);
        return;
      }

      // Try to check backend connectivity
      const isBackendReachable = await offlineManager.checkConnectivity();
      
      if (!isBackendReachable) {
        console.log('📴 Backend unreachable - checking offline grace period');
        
        // Load cached user if available
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          
          // Check if we're within grace period
          if (offlineManager.isWithinGracePeriod()) {
            setUser(parsedUser);
            setOfflineMode(true);
            
            const state = offlineManager.getState();
            setGraceExpiry(state.graceExpiry);
            setDaysRemaining(offlineManager.getDaysRemaining());
            
            console.log(`✅ Offline mode active - ${offlineManager.getDaysRemaining()} days remaining`);
            message.info(`Working offline. ${offlineManager.getDaysRemaining()} days remaining in grace period.`);
          } else {
            console.error('❌ Offline grace period expired');
            handleSessionExpired();
            message.error('Your offline access has expired. Please reconnect to continue.');
          }
        } else {
          console.error('❌ No cached user data available');
          handleSessionExpired();
        }
        
        setLoading(false);
        return;
      }

      // Backend is reachable - validate token
      if (!backendAPI.isTokenValid()) {
        console.log('⚠️ Token expired, attempting refresh...');
        try {
          await backendAPI.performTokenRefresh();
        } catch (error) {
          console.error('❌ Failed to refresh token:', error);
          handleSessionExpired();
          setLoading(false);
          return;
        }
      }

      // Fetch fresh user profile
      try {
        const userData = await backendAPI.getProfile();
        setUser(userData);
        setOfflineMode(false);
        setIsOnline(true);
        console.log('✅ Session restored:', userData.email);
      } catch (error: any) {
        console.error('❌ Failed to fetch profile:', error);
        
        // If we have cached data, use it
        if (cachedUser && offlineManager.isWithinGracePeriod()) {
          setUser(JSON.parse(cachedUser));
          setOfflineMode(true);
          const state = offlineManager.getState();
          setGraceExpiry(state.graceExpiry);
          setDaysRemaining(offlineManager.getDaysRemaining());
          console.log('⚠️ Using cached user data');
        } else {
          handleSessionExpired();
        }
      }

    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      handleSessionExpired();
    } finally {
      setLoading(false);
    }
  };

  const handleSessionExpired = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_cache');
    offlineManager.clearState();
    setUser(null);
    setOfflineMode(false);
  };

  // Periodic connectivity check
  useEffect(() => {
    const checkOffline = async () => {
      const isBackendOnline = await offlineManager.checkConnectivity();
      const state = offlineManager.getState();
      
      setIsOnline(navigator.onLine && isBackendOnline);
      setOfflineMode(state.isOffline);
      setGraceExpiry(state.graceExpiry);
      setDaysRemaining(offlineManager.getDaysRemaining());
      
      // Force logout if grace period expired
      if (offlineManager.shouldForceLogout() && user) {
        console.error('❌ Grace period expired - forcing logout');
        await logout();
        message.error('Your offline access has expired. Please reconnect to continue.');
      }
      
      // If we came back online and have a user, try to sync
      if (isBackendOnline && user && state.isOffline) {
        console.log('🌐 Backend reconnected - attempting to sync');
        try {
          await refreshSession();
          message.success('Connection restored - syncing data...');
        } catch (error) {
          console.error('Failed to sync on reconnection:', error);
        }
      }
    };
    
    // Initial check
    checkOffline();
    
    // Check every 30 seconds
    connectivityCheckInterval.current = setInterval(checkOffline, 30000);
    
    return () => {
      if (connectivityCheckInterval.current) {
        clearInterval(connectivityCheckInterval.current);
      }
    };
  }, [user]);

  // Listen for auth logout events from API service
  useEffect(() => {
    const handleAuthLogout = () => {
      console.log('🔒 Received logout event from API service');
      setUser(null);
      setOfflineMode(false);
      message.warning('Session expired. Please login again.');
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  // Monitor browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Browser online event detected');
      setIsOnline(true);
      
      // Trigger connectivity check
      if (user) {
        offlineManager.checkConnectivity().then(async (isOnline) => {
          if (isOnline) {
            console.log('✅ Backend reachable - syncing session');
            await refreshSession();
            message.success('Connection restored');
          }
        });
      }
    };

    const handleOffline = () => {
      console.log('📴 Browser offline event detected');
      setIsOnline(false);
      
      // Enable grace period if we have a user
      if (user) {
        const state = offlineManager.getState();
        if (!state.isOffline) {
          offlineManager.handleNetworkError();
          const updatedState = offlineManager.getState();
          setOfflineMode(true);
          setGraceExpiry(updatedState.graceExpiry);
          setDaysRemaining(offlineManager.getDaysRemaining());
          message.warning(`Working offline. ${offlineManager.getDaysRemaining()} days remaining.`);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    if (!user) return;
    
    try {
      const userData = await backendAPI.getProfile();
      setUser(userData);
      setOfflineMode(false);
      offlineManager.markAsOnline();
      console.log('✅ Session refreshed');
    } catch (error: any) {
      console.error('❌ Failed to refresh session:', error);
      
      // If offline, update state accordingly
      if (error.offline) {
        setOfflineMode(true);
      }
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      const response = await backendAPI.login(email, password);
      setUser(response.user);
      setOfflineMode(false);
      setIsOnline(true);
      console.log('✅ Login successful:', response.user.email);
      message.success(`Welcome back, ${response.user.first_name}!`);
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      // Handle offline login attempts
      if (error.offline) {
        message.error('Cannot login while offline. Please check your connection.');
      } else {
        const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
        message.error(errorMessage);
      }
      
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    return new Promise<void>((resolve, reject) => {
      // Check if online
      if (!navigator.onLine) {
        message.error('Cannot use Google Sign-In while offline');
        reject(new Error('Offline - cannot use Google Sign-In'));
        return;
      }

      // Load Google Identity Services
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        const clientId = '907119615398-tf4fdpll1eig441jcgmp2g6kd99p928q.apps.googleusercontent.com';
        
        if (!clientId) {
          message.error('Google Sign-In is not configured');
          reject(new Error('Google client ID not found'));
          return;
        }

        // @ts-ignore - Google Identity Services
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            try {
              const result = await backendAPI.loginWithGoogle(response.credential);
              setUser(result.user);
              setOfflineMode(false);
              setIsOnline(true);
              message.success(`Welcome, ${result.user.first_name}!`);
              console.log('✅ Google login successful:', result.user.email);
              resolve();
            } catch (error: any) {
              console.error('❌ Google login failed:', error);
              
              if (error.offline) {
                message.error('Cannot complete Google Sign-In while offline');
              } else {
                const errorMessage = error.response?.data?.detail || 'Google Sign-In failed';
                message.error(errorMessage);
              }
              
              reject(error);
            }
          },
        });

        // @ts-ignore
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One Tap not displayed');
            // @ts-ignore
            window.google.accounts.id.renderButton(
              document.getElementById('google-signin-button'),
              { 
                theme: 'outline', 
                size: 'large', 
                width: '100%',
                text: 'continue_with',
              }
            );
          }
        });
      };

      script.onerror = () => {
        message.error('Failed to load Google Sign-In');
        reject(new Error('Failed to load Google SDK'));
      };

      document.body.appendChild(script);
    });
  };

  const register = async (userData: any) => {
    try {
      const response = await backendAPI.register(userData);
      
      if (response.user) {
        setUser(response.user);
        setOfflineMode(false);
        setIsOnline(true);
        message.success('Account created successfully!');
      }
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      if (error.offline) {
        message.error('Cannot register while offline. Please check your connection.');
      } else {
        const errorMessage = error.response?.data?.email?.[0] || 
                            error.response?.data?.username?.[0] || 
                            error.response?.data?.detail || 
                            'Registration failed. Please try again.';
        message.error(errorMessage);
      }
      
      throw error;
    }
  };

  const logout = async () => {
    try {
      await backendAPI.logout();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setUser(null);
      setOfflineMode(false);
      setGraceExpiry(null);
      setDaysRemaining(0);
      
      // Clear connectivity check interval
      if (connectivityCheckInterval.current) {
        clearInterval(connectivityCheckInterval.current);
      }
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user_cache', JSON.stringify(updatedUser));
    }
  };

  const completeOnboarding = async () => {
    try {
      await backendAPI.completeOnboarding();
      if (user) {
        const updatedUser = { ...user, account_state: 'active' };
        setUser(updatedUser);
        localStorage.setItem('user_cache', JSON.stringify(updatedUser));
        message.success('Welcome to NOVEM!');
      }
    } catch (error: any) {
      console.error('❌ Onboarding completion failed:', error);
      
      if (error.offline) {
        message.error('Cannot complete onboarding while offline');
      } else {
        message.error('Failed to complete onboarding');
      }
      
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    if (!navigator.onLine) {
      message.error('Cannot request password reset while offline');
      throw new Error('Offline - cannot reset password');
    }

    try {
      await backendAPI.requestPasswordReset(email);
      console.log('✅ Password reset email sent to:', email);
      message.success('Password reset instructions sent to your email');
    } catch (error: any) {
      console.error('❌ Password reset request failed:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.email?.[0] || 
                          'Failed to send reset instructions. Please try again.';
      message.error(errorMessage);
      throw error;
    }
  };

  const isOnboardingComplete = user?.account_state === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        needsOnboarding: user ? !isOnboardingComplete : false,
        loading,
        isOnline,
        offlineMode,
        graceExpiry,
        daysRemaining,
        login,
        loginWithGoogle,
        register,
        logout,
        updateUser,
        completeOnboarding,
        refreshSession,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};