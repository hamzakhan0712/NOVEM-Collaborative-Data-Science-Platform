import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { backendAPI } from '../services/api';
import { message } from 'antd';
import { offlineManager, storageManager } from '../services/offline';
import { invoke } from '@tauri-apps/api/core';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_onboarding_complete: boolean;
  account_state: string;
  profile_picture?: string;
  profile_picture_url?: string; // Add this
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
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  completeOnboarding: (profileData: {
    first_name: string;
    last_name: string;
    bio?: string;
    organization: string;
    job_title: string;
    location: string;
  }) => Promise<void>;
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
  const [daysRemaining, setDaysRemaining] = useState(30);
  const isInitialized = useRef(false);

 
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    initAuth();
  }, []);

  const checkBackendConnectivity = async (): Promise<boolean> => {
    try {
      // Try Tauri command first (more reliable for desktop)
      try {
        await invoke('check_backend_health');
        return true;
      } catch (tauriError) {
        // Fallback to direct fetch
        const response = await fetch('http://localhost:8000/api/health/', {
          method: 'HEAD',
          cache: 'no-store',
        });
        return response.ok;
      }
    } catch (error) {
      console.warn('Backend connectivity check failed:', error);
      return false;
    }
  };

  const initAuth = async () => {
    try {
      // Check session using storage manager
      const session = await storageManager.getCurrentSession();
      
      if (!session.session_active) {
        console.log('⏸️ No active session found');
        setLoading(false);
        return;
      }

      console.log('🔍 Active session found, checking backend...');
      const isBackendReachable = await checkBackendConnectivity();
      
      if (!isBackendReachable) {
        console.log('📴 Backend unreachable');
        
        // Check if we already have an offline state with grace period
        const offlineState = offlineManager.getState();
        
        if (offlineState.isOffline) {
          // Already in offline mode, check if still within grace period
          console.log('⏰ Checking existing grace period...');
          if (offlineManager.isWithinGracePeriod()) {
            console.log('✅ Within grace period');
            const cachedUser = localStorage.getItem('user_cache');
            if (cachedUser) {
              const userData = JSON.parse(cachedUser);
              setUser(userData);
              setOfflineMode(true);
              setIsOnline(false);
              
              const state = offlineManager.getState();
              setGraceExpiry(state.graceExpiry);
              const days = offlineManager.getDaysRemaining();
              setDaysRemaining(days);
              
              message.info({
                content: `Working offline. ${days} day${days !== 1 ? 's' : ''} remaining.`,
                duration: 5,
              });
            }
          } else {
            console.log('❌ Grace period expired');
            handleSessionExpired();
            message.error('Your offline access has expired. Please reconnect to continue.');
          }
        } else {
          // First time going offline - DON'T start grace period yet
          // Just try to use cached data temporarily
          console.log('⚠️ First disconnect - using cached data without starting grace period');
          const cachedUser = localStorage.getItem('user_cache');
          if (cachedUser) {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setOfflineMode(false); // Not in offline mode yet
            setIsOnline(false);
            
            message.warning({
              content: 'Cannot connect to server. Retrying...',
              duration: 3,
            });
          } else {
            handleSessionExpired();
          }
        }
        
        setLoading(false);
        return;
      }

      // Backend reachable - proceed with normal auth
      console.log('🌐 Backend reachable');
      setIsOnline(true);
      
      if (!backendAPI.isTokenValid()) {
        console.log('🔄 Token invalid, refreshing...');
        try {
          await backendAPI.performTokenRefresh();
        } catch (error) {
          console.error('❌ Token refresh failed:', error);
          handleSessionExpired();
          setLoading(false);
          return;
        }
      }

      try {
        console.log('👤 Fetching user profile...');
        const userData = await backendAPI.getProfile();
        console.log('✅ Profile fetched successfully');
        
        setUser(userData);
        setOfflineMode(false);
        
        // Cache user data for offline use
        localStorage.setItem('user_cache', JSON.stringify(userData));
        
        // Store in compute engine or localStorage
        await storageManager.storeSession({
          user_id: userData.id.toString(),
          email: userData.email,
          username: userData.username,
          access_token: localStorage.getItem('access_token') || '',
          refresh_token: localStorage.getItem('refresh_token') || '',
          account_state: userData.account_state || 'active'
        });
        
        // Mark as online and clear any offline state
        offlineManager.markAsOnline();
        
      } catch (error: any) {
        console.error('❌ Failed to fetch user profile:', error);
        
        // If this fails, check grace period
        const offlineState = offlineManager.getState();
        const cachedUser = localStorage.getItem('user_cache');
        
        if (offlineState.isOffline && offlineManager.isWithinGracePeriod() && cachedUser) {
          console.log('✅ Using cached user (within grace)');
          setUser(JSON.parse(cachedUser));
          setOfflineMode(true);
          setIsOnline(false);
          const state = offlineManager.getState();
          setGraceExpiry(state.graceExpiry);
          const days = offlineManager.getDaysRemaining();
          setDaysRemaining(days);
          
          message.warning({
            content: `Working offline. ${days} day${days !== 1 ? 's' : ''} remaining.`,
            duration: 5,
          });
        } else {
          handleSessionExpired();
        }
      }

    } catch (error) {
      console.error('❌ Init auth error:', error);
      handleSessionExpired();
    } finally {
      setLoading(false);
    }
  };

  const handleSessionExpired = () => {
    setUser(null);
    setOfflineMode(false);
    setIsOnline(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_cache');
    offlineManager.clearState();
  };

  // Periodic connectivity check
  useEffect(() => {
    if (!user) return;

    console.log('🔍 Starting connectivity monitoring...');

    const checkInterval = setInterval(async () => {
      const wasOnline = isOnline;
      const nowOnline = await checkBackendConnectivity();
      
      console.log(`🌐 Connectivity check:`, { wasOnline, nowOnline });
      
      setIsOnline(nowOnline);
      
      if (!nowOnline && wasOnline) {
        // Just went offline
        console.log('📴 Connection lost');
        
        const offlineState = offlineManager.getState();
        
        if (!offlineState.isOffline) {
          // Start grace period
          console.log('⏰ Starting offline grace period');
          offlineManager.handleNetworkError();
          setOfflineMode(true);
          
          const updatedState = offlineManager.getState();
          setGraceExpiry(updatedState.graceExpiry);
          const days = offlineManager.getDaysRemaining();
          setDaysRemaining(days);
          
          message.warning({
            content: `Connection lost. Offline mode activated (${days} day${days !== 1 ? 's' : ''} remaining)`,
            duration: 5,
          });
        }
      } else if (nowOnline && !wasOnline) {
        // Just came back online
        console.log('🌐 Connection restored');
        offlineManager.markAsOnline();
        setOfflineMode(false);
        setGraceExpiry(null);
        setDaysRemaining(7);
        
        message.success({
          content: 'Connection restored',
          duration: 3,
        });
        
        // Refresh user data
        try {
          const userData = await backendAPI.getProfile();
          setUser(userData);
          localStorage.setItem('user_cache', JSON.stringify(userData));
        } catch (error) {
          console.error('❌ Failed to refresh user data:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      console.log('🛑 Stopping connectivity monitoring');
      clearInterval(checkInterval);
    };
  }, [user, isOnline]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setOfflineMode(false);
      message.warning('Session expired. Please login again.');
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      if (user) {
        offlineManager.checkConnectivity().then(async (isOnline) => {
          if (isOnline) {
            await refreshSession();
            message.success('Connection restored');
          }
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      
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

  const refreshSession = useCallback(async () => {
    if (!user) return;
    
    try {
      const userData = await backendAPI.getProfile();
      setUser(userData);
      setOfflineMode(false);
      offlineManager.markAsOnline();
    } catch (error: any) {
      if (error.offline) {
        setOfflineMode(true);
      }
    }
  }, [user]);

  
  const login = async (email: string, password: string) => {
    try {
      const isBackendReachable = await checkBackendConnectivity();
      
      if (!isBackendReachable) {
        throw new Error('Cannot login while offline. Please check your connection.');
      }

      const response = await backendAPI.login(email, password);
      
      const { access, refresh, user: userData } = response;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_cache', JSON.stringify(userData));
      
      setUser(userData);
      setOfflineMode(false);
      setIsOnline(true);
      
      await storageManager.storeSession({
        user_id: userData.id.toString(),
        email: userData.email,
        username: userData.username,
        access_token: access,
        refresh_token: refresh,
        account_state: userData.account_state || 'active'
      });
      
      offlineManager.markAsOnline();
      
      message.success('Login successful');
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const isBackendReachable = await checkBackendConnectivity();
      
      if (isBackendReachable) {
        await backendAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleSessionExpired();
      message.success('Logged out successfully');
    }
  };

  const register = async (_userData: any) => {
    try {
      const isBackendReachable = await checkBackendConnectivity();
      
      if (!isBackendReachable) {
        throw new Error('Cannot register while offline. Please check your connection.');
      }

      message.success('Registration successful! Please login.');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const completeOnboarding = async (profileData: {
    first_name: string;
    last_name: string;
    bio?: string;
    organization: string;
    job_title: string;
    location: string;
  }) => {
    try {
      const response = await backendAPI.completeOnboarding(profileData);
      
      if (response.user) {
        setUser(response.user);
        localStorage.setItem('user_cache', JSON.stringify(response.user));
      }
      
      message.success('Welcome to NOVEM!');
      
      return response;
    } catch (error: any) {
      if (error.offline) {
        message.error('Cannot complete onboarding while offline');
      } else {
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.first_name?.[0] ||
                            error.response?.data?.organization?.[0] ||
                            error.response?.data?.error ||
                            'Failed to complete onboarding';
        message.error(errorMessage);
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
      message.success('Password reset instructions sent to your email');
    } catch (error: any) {
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