import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Select,
  Switch,
  Divider,
  message,
  Modal,
} from 'antd';
import {
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  GlobalOutlined,
  TeamOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { backendAPI } from '../../services/api';
import { storageManager } from '../../services/offline';

const { Title, Text } = Typography;
const { Option } = Select;

const SecuritySection: React.FC = () => {
  const { offlineMode } = useAuth();
  const { theme: themeMode } = useTheme();
  const [passwordForm] = Form.useForm();
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    profile_visibility: 'workspace',
    show_active_status: true,
  });

  const isDark = themeMode === 'dark';

  useEffect(() => {
    loadSecuritySettings();
  }, [offlineMode]);

  const loadSecuritySettings = async () => {
    try {
      // Always load from cache first
      console.log('[SecuritySection] Loading from cache...');
      const cached = localStorage.getItem('security_settings');
      
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('[SecuritySection] Found cached security settings');
        setSecuritySettings(parsed);
      }

      // If online, fetch fresh data
      if (!offlineMode) {
        console.log('[SecuritySection] Fetching fresh data from API...');
        try {
          const data = await backendAPI.getSecuritySettings();
          console.log('[SecuritySection] Received security settings');
          setSecuritySettings(data);
          localStorage.setItem('security_settings', JSON.stringify(data));
        } catch (apiError: any) {
          console.warn('[SecuritySection] API fetch failed, using cached data:', apiError);
        }
      } else {
        console.log('📴 [SecuritySection] Offline mode - using cached data only');
      }
    } catch (error) {
      console.error('[SecuritySection] Failed to load security settings:', error);
    }
  };

  const handlePasswordChange = async (values: any) => {
    if (offlineMode) {
      message.warning('Cannot change password while offline');
      return;
    }

    try {
      setLoadingPassword(true);
      await backendAPI.changePassword(
        values.current_password,
        values.new_password,
        values.new_password_confirm
      );

      passwordForm.resetFields();
      message.success('Password changed successfully');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const errorMsg = error.response?.data?.current_password?.[0] ||
                       error.response?.data?.new_password?.[0] ||
                       error.response?.data?.error ||
                       'Failed to change password';
      message.error(errorMsg);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleVisibilityChange = async (value: string) => {
    if (offlineMode) {
      // Update locally for offline use
      const updated = { ...securitySettings, profile_visibility: value };
      setSecuritySettings(updated);
      localStorage.setItem('security_settings', JSON.stringify(updated));
      localStorage.setItem('pending_security_update', JSON.stringify({ profile_visibility: value }));
      message.info('Setting saved locally (will sync when online)');
      return;
    }

    try {
      setLoadingSettings(true);
      await backendAPI.updateSecuritySettings({ profile_visibility: value });
      const updated = { ...securitySettings, profile_visibility: value };
      setSecuritySettings(updated);
      localStorage.setItem('security_settings', JSON.stringify(updated));
      localStorage.removeItem('pending_security_update');
      message.success('Profile visibility updated');
    } catch (error) {
      console.error('Failed to update visibility:', error);
      message.error('Failed to update profile visibility');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleActiveStatusChange = async (checked: boolean) => {
    if (offlineMode) {
      // Update locally for offline use
      const updated = { ...securitySettings, show_active_status: checked };
      setSecuritySettings(updated);
      localStorage.setItem('security_settings', JSON.stringify(updated));
      localStorage.setItem('pending_security_update', JSON.stringify({ show_active_status: checked }));
      message.info('Setting saved locally (will sync when online)');
      return;
    }

    try {
      setLoadingSettings(true);
      await backendAPI.updateSecuritySettings({ show_active_status: checked });
      const updated = { ...securitySettings, show_active_status: checked };
      setSecuritySettings(updated);
      localStorage.setItem('security_settings', JSON.stringify(updated));
      localStorage.removeItem('pending_security_update');
      message.success('Active status setting updated');
    } catch (error) {
      console.error('Failed to update active status:', error);
      message.error('Failed to update active status setting');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleClearCache = async () => {
    Modal.confirm({
      title: 'Clear Local Cache',
      content: 'This will clear all locally stored data. The application will reload and you will remain logged in.',
      okText: 'Clear Cache',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await backendAPI.clearLocalCache();
          
          // Clear storage manager cache (keeps auth tokens)
          const access = await storageManager.getAccessToken();
          const refresh = localStorage.getItem('refresh_token');
          
          // Clear localStorage
          localStorage.clear();
          sessionStorage.clear();
          
          // Restore auth tokens
          if (access) localStorage.setItem('access_token', access);
          if (refresh) localStorage.setItem('refresh_token', refresh);
          
          message.success('Cache cleared successfully');
          
          // Reload page
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          console.error('Failed to clear cache:', error);
          message.error('Failed to clear cache');
        }
      },
    });
  };

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Security & Privacy
        </Title>
        <Text type="secondary">
          Manage your password, privacy settings, and security preferences
          {offlineMode && ' (Limited functionality offline)'}
        </Text>
      </div>

      {/* Change Password */}
      <Card
        variant="borderless"
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
          disabled={offlineMode}
        >
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '15px' }}>
              Change Password
              {offlineMode && (
                <Text type="secondary" style={{ fontSize: '13px', marginLeft: '8px' }}>
                  (Unavailable offline)
                </Text>
              )}
            </Text>

            <Form.Item
              label="Current Password"
              name="current_password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Enter current password"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="new_password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Enter new password"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="new_password_confirm"
              dependencies={['new_password']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Confirm new password"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<CheckCircleOutlined />}
                loading={loadingPassword}
                disabled={offlineMode}
              >
                {offlineMode ? 'Offline' : 'Change Password'}
              </Button>
            </div>
          </Space>
        </Form>
      </Card>

      {/* Privacy Settings */}
      <Card
        variant="borderless"
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Privacy Settings
            {offlineMode && (
              <Text type="secondary" style={{ fontSize: '13px', marginLeft: '8px' }}>
                (Changes saved locally)
              </Text>
            )}
          </Text>

          <div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                Profile Visibility
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Control who can view your profile information
              </Text>
            </div>
            <Select
              value={securitySettings.profile_visibility}
              onChange={handleVisibilityChange}
              style={{ width: '100%' }}
              loading={loadingSettings}
              disabled={loadingSettings}
            >
              <Option value="public">
                <Space>
                  <GlobalOutlined />
                  <span>Public - Anyone can view</span>
                </Space>
              </Option>
              <Option value="workspace">
                <Space>
                  <TeamOutlined />
                  <span>Workspace Members - Only workspace members can view</span>
                </Space>
              </Option>
              <Option value="private">
                <Space>
                  <LockOutlined />
                  <span>Private - Only you can view</span>
                </Space>
              </Option>
            </Select>
          </div>

          <Divider style={{ margin: 0 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                Show Active Status
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Let others see when you're active on NOVEM
              </Text>
            </div>
            <Switch
              checked={securitySettings.show_active_status}
              onChange={handleActiveStatusChange}
              loading={loadingSettings}
              disabled={loadingSettings}
            />
          </div>
        </Space>
      </Card>

      {/* Data & Cache */}
      <Card
        variant="borderless"
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space orientation="vertical" size={20} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Local Data
          </Text>

          <div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                Clear Local Cache
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Remove all locally stored data. You will remain logged in but the app will reload.
              </Text>
            </div>
            <Button
              icon={<DeleteOutlined />}
              onClick={handleClearCache}
            >
              Clear Cache
            </Button>
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export default SecuritySection;