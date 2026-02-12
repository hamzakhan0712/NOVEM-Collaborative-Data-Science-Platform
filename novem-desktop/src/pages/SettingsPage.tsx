import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Spin, message, Alert } from 'antd';
import {
  UserOutlined,
  BellOutlined,
  SafetyOutlined,
  WarningOutlined,
  ToolOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { backendAPI } from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import { colors } from '../theme/config';

// Import section components
import ProfileSection from '../components/settings/ProfileSection';
import AccountSection from '../components/settings/AccountSection';
import SecuritySection from '../components/settings/SecuritySection';
import NotificationsSection from '../components/settings/NotificationsSection';
import DangerZoneSection from '../components/settings/DangerZoneSection';

const { Sider, Content } = Layout;
const { Text } = Typography;

type SettingsSection = 'profile' | 'account' | 'security' | 'notifications' | 'danger';

const SettingsPage: React.FC = () => {
  const { theme } = useTheme();
  const { user, offlineMode } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const isDark = theme === 'dark';

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, [offlineMode]);

  const loadProfileData = async () => {
    setLoading(true);
    
    try {
      // Always load from cache first for instant display
      console.log('[SettingsPage] Loading from cache...');
      const cachedProfile = localStorage.getItem('profile_cache');
      
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        console.log('[SettingsPage] Found cached profile');
        setProfileData(parsed);
      } else if (user) {
        // Use user data from AuthContext as fallback
        console.log('[SettingsPage] Using user data from context');
        setProfileData({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            profile_picture: user.profile_picture,
            profile_picture_url: user.profile_picture_url,
            is_onboarding_complete: user.is_onboarding_complete,
            account_state: user.account_state,
            created_at: user.created_at,
          },
          preferences: {
            theme: theme,
            notifications_enabled: true,
            email_notifications: true,
          },
        });
      }

      // If online, fetch fresh data in background
      if (!offlineMode) {
        console.log('[SettingsPage] Fetching fresh data from API...');
        try {
          const data = await backendAPI.getProfile();
          console.log('[SettingsPage] Received profile data');
          
          setProfileData(data.profile);
          
          // Cache the fresh data
          localStorage.setItem('profile_cache', JSON.stringify(data.profile));
          console.log('[SettingsPage] Cached profile data');
        } catch (apiError: any) {
          console.warn('[SettingsPage] API fetch failed, using cached data:', apiError);
          
          // If we don't have cached data, show error
          if (!cachedProfile && !apiError.offline) {
            message.error('Failed to load profile data');
          }
        }
      } else {
        console.log('📴 [SettingsPage] Offline mode - using cached data only');
        if (!cachedProfile && !user) {
          message.info('No cached profile data available offline');
        }
      }
    } catch (error: any) {
      console.error('[SettingsPage] Load failed:', error);
      message.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'account',
      icon: <ToolOutlined />,
      label: 'Account',
    },
    {
      key: 'security',
      icon: <SafetyOutlined />,
      label: 'Security',
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: 'danger',
      icon: <WarningOutlined />,
      label: 'Danger Zone',
    },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection profileData={profileData} onUpdate={loadProfileData} />;
      case 'account':
        return <AccountSection profileData={profileData} />;
      case 'security':
        return <SecuritySection />;
      case 'notifications':
        return <NotificationsSection profileData={profileData} />;
      case 'danger':
        return <DangerZoneSection />;
      default:
        return <ProfileSection profileData={profileData} onUpdate={loadProfileData} />;
    }
  };

  if (loading && !profileData) {
    return (
      <MainLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
        }}>
          <Spin size="large" tip="Loading settings..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Layout 
        style={{ 
          minHeight: 'calc(100vh - 64px)', 
          backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
        }}
      >
        {/* Main Content */}
        <Content
          style={{
            padding: '40px 48px',
            backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
            overflow: 'auto',
          }}
        >
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Offline Mode Banner */}
            {offlineMode && (
              <Alert
                message="Offline Mode"
                description="You are viewing cached settings. Some features are limited while offline. Changes will be synced when you reconnect."
                type="warning"
                icon={<WifiOutlined />}
                showIcon
                closable
                style={{ 
                  marginBottom: '24px',
                  borderRadius: '8px',
                }}
              />
            )}

            {renderSection()}
          </div>
        </Content>

        {/* Right Sidebar Navigation */}
        <Sider
          width={240}
          style={{
            backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
            borderLeft: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            padding: '40px 0',
          }}
        >
          <div style={{ padding: '0 20px', marginBottom: '24px' }}>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: '11px', 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                fontWeight: 600,
                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
              }}
            >
              Settings
            </Text>

            {/* Offline Indicator in Sidebar */}
            {offlineMode && (
              <div 
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: isDark 
                    ? 'rgba(250, 173, 20, 0.1)' 
                    : 'rgba(250, 173, 20, 0.08)',
                  borderRadius: '6px',
                  border: `1px solid ${isDark 
                    ? 'rgba(250, 173, 20, 0.3)' 
                    : 'rgba(250, 173, 20, 0.2)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <WifiOutlined 
                    style={{ 
                      fontSize: '12px', 
                      color: colors.warning,
                    }} 
                  />
                  <Text 
                    style={{ 
                      fontSize: '11px', 
                      color: colors.warning,
                      fontWeight: 500,
                    }}
                  >
                    Offline Mode
                  </Text>
                </div>
                <Text 
                  type="secondary" 
                  style={{ 
                    fontSize: '10px',
                    display: 'block',
                    marginTop: '4px',
                    color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                  }}
                >
                  Limited functionality
                </Text>
              </div>
            )}
          </div>

          <Menu
            mode="inline"
            selectedKeys={[activeSection]}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
            }}
          >
            {menuItems.map((item) => (
              <Menu.Item
                key={item.key}
                icon={item.icon}
                onClick={() => setActiveSection(item.key as SettingsSection)}
                style={{
                  height: '40px',
                  margin: '2px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  lineHeight: '40px',
                  padding: '0 16px',
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                }}
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu>
        </Sider>
      </Layout>
    </MainLayout>
  );
};

export default SettingsPage;