import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Card,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Avatar,
  Space,
  Typography,
  Divider,
  message,
  Upload,
  Row,
  Col,
  Alert,
  Modal,
  Spin,
  Tag,
  Badge,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  SettingOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  CameraOutlined,
  SaveOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  MailOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  RiseOutlined,
  BankOutlined,
  DownloadOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  KeyOutlined,
  IeOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { backendAPI } from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import { colors } from '../theme/config';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

type SettingsSection = 'profile' | 'account' | 'security' | 'notifications' | 'preferences' | 'data' | 'danger';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [profileData, setProfileData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isDark = theme === 'dark';

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const response = await backendAPI.client.get('/auth/profile/detail/');
      setProfileData(response.data);
      
      // Set form values
      profileForm.setFieldsValue({
        first_name: user?.first_name,
        last_name: user?.last_name,
        email: user?.email,
        bio: response.data.bio,
        organization: response.data.organization,
        job_title: response.data.job_title,
        location: response.data.location,
        website: response.data.website,
      });

      notificationForm.setFieldsValue({
        email_notifications: response.data.email_notifications,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      message.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (values: any) => {
    try {
      setLoading(true);
      const response = await backendAPI.updateProfile(values);
      
      // Update user context
      updateUser({
        first_name: values.first_name,
        last_name: values.last_name,
      });

      setProfileData(response.profile);
      setHasUnsavedChanges(false);
      message.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      message.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    try {
      setLoading(true);
      await backendAPI.client.post('/auth/password/change/', {
        old_password: values.current_password,
        new_password: values.new_password,
      });
      
      passwordForm.resetFields();
      message.success('Password changed successfully');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      message.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async (values: any) => {
    try {
      setLoading(true);
      await backendAPI.updateProfile(values);
      message.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update notifications:', error);
      message.error('Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    confirm({
      title: 'Delete Account',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            message="This action cannot be undone"
            description="Deleting your account will permanently remove all your data, including projects, workspaces, and datasets."
            type="warning"
            showIcon
          />
          <Text>Please type your email address to confirm:</Text>
        </Space>
      ),
      okText: 'Delete My Account',
      okType: 'danger',
      cancelText: 'Cancel',
      width: 520,
      onOk: async () => {
        try {
          await backendAPI.client.delete('/auth/profile/delete/');
          message.success('Account deleted successfully');
          await logout();
          navigate('/login');
        } catch (error) {
          message.error('Failed to delete account');
        }
      },
    });
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'account',
      icon: <IdcardOutlined />,
      label: 'Account',
    },
    {
      key: 'security',
      icon: <IeOutlined />,
      label: 'Security',
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: 'preferences',
      icon: <SettingOutlined />,
      label: 'Preferences',
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: 'Data & Privacy',
    },
    {
      key: 'danger',
      icon: <ExclamationCircleOutlined />,
      label: 'Account Management',
    },
  ];

  const renderProfileSection = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Header */}
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Profile Information
        </Title>
        <Text type="secondary">
          Manage your personal information and public profile
        </Text>
      </div>

      {/* Profile Picture */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Avatar
              size={96}
              icon={<UserOutlined />}
              src={user?.profile_picture}
              style={{
                backgroundColor: colors.logoCyan,
                fontSize: '36px',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', fontSize: '15px', marginBottom: '8px' }}>
                Profile Picture
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: '13px', marginBottom: '16px' }}>
                JPG, PNG or GIF. Max size 2MB. Recommended 400x400px.
              </Text>
              <Space size={12}>
                <Upload
                  showUploadList={false}
                  beforeUpload={() => {
                    message.info('Profile picture upload coming soon');
                    return false;
                  }}
                >
                  <Button icon={<CameraOutlined />}>Upload New</Button>
                </Upload>
                {user?.profile_picture && (
                  <Button danger>Remove</Button>
                )}
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      {/* Basic Information */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleProfileUpdate}
          onValuesChange={() => setHasUnsavedChanges(true)}
        >
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '15px' }}>
              Personal Information
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="First Name"
                  name="first_name"
                  rules={[{ required: true, message: 'Please enter your first name' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="John"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Last Name"
                  name="last_name"
                  rules={[{ required: true, message: 'Please enter your last name' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="Doe"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Email Address"
              name="email"
              extra="Your email address cannot be changed. Contact support if needed."
            >
              <Input
                prefix={<MailOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                disabled
              />
            </Form.Item>

            <Form.Item
              label="Bio"
              name="bio"
              extra="Brief description about yourself. Visible to team members."
            >
              <TextArea
                rows={4}
                placeholder="Tell us about yourself..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Divider />

            <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '16px' }}>
              Professional Details
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Organization"
                  name="organization"
                >
                  <Input
                    prefix={<BankOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="Company or organization name"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Job Title"
                  name="job_title"
                >
                  <Input
                    prefix={<RiseOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="Your role or position"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Location"
                  name="location"
                >
                  <Input
                    prefix={<EnvironmentOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="City, Country"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Website"
                  name="website"
                  rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
                >
                  <Input
                    prefix={<LinkOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="https://example.com"
                  />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
              <Button
                onClick={() => {
                  profileForm.resetFields();
                  setHasUnsavedChanges(false);
                }}
                disabled={!hasUnsavedChanges}
              >
                Discard Changes
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                disabled={!hasUnsavedChanges}
              >
                Save Changes
              </Button>
            </div>
          </Space>
        </Form>
      </Card>
    </Space>
  );

  const renderAccountSection = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Account Information
        </Title>
        <Text type="secondary">
          View and manage your account details
        </Text>
      </div>

      {/* Account Status */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Account Status
          </Text>

          <Row gutter={16}>
            <Col span={6}>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Account Type
                </Text>
                <Text strong style={{ fontSize: '16px' }}>Individual</Text>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </Text>
                <Badge
                  status={user?.account_state === 'active' ? 'success' : 'warning'}
                  text={
                    <Text strong style={{ fontSize: '16px', textTransform: 'capitalize' }}>
                      {user?.account_state}
                    </Text>
                  }
                />
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Member Since
                </Text>
                <Text strong style={{ fontSize: '16px' }}>
                  {profileData?.created_at
                    ? new Date(profileData.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </Text>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  User ID
                </Text>
                <Text code strong style={{ fontSize: '14px' }}>
                  #{user?.id}
                </Text>
              </div>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Account Actions */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Quick Actions
          </Text>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Export Account Data</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Download a copy of all your account data
              </Text>
            </Space>
            <Button icon={<ExportOutlined />}>Export</Button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Active Sessions</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                View and manage your active login sessions
              </Text>
            </Space>
            <Button icon={<ClockCircleOutlined />}>View Sessions</Button>
          </div>
        </Space>
      </Card>
    </Space>
  );

  const renderSecuritySection = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Security Settings
        </Title>
        <Text type="secondary">
          Manage password and authentication methods
        </Text>
      </div>

      {/* Change Password */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '15px' }}>
              Change Password
            </Text>

            <Form.Item
              label="Current Password"
              name="current_password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Enter your current password"
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
                prefix={<KeyOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Enter a strong password"
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="confirm_password"
              dependencies={['new_password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
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
                prefix={<KeyOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Re-enter your new password"
              />
            </Form.Item>

            <Alert
              message="Password Requirements"
              description={
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px', fontSize: '13px' }}>
                  <li>Minimum 8 characters</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one lowercase letter</li>
                  <li>At least one number</li>
                  <li>At least one special character</li>
                </ul>
              }
              type="info"
              showIcon
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<CheckCircleOutlined />}
              >
                Update Password
              </Button>
            </div>
          </Space>
        </Form>
      </Card>

      {/* Two-Factor Authentication */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Two-Factor Authentication
          </Text>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Space size={8}>
                <Text strong style={{ fontSize: '14px' }}>Two-Factor Authentication</Text>
                <Tag color="default">Not Enabled</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Add an extra layer of security to your account
              </Text>
            </Space>
            <Button type="primary" icon={<IeOutlined />}>
              Enable 2FA
            </Button>
          </div>
        </Space>
      </Card>
    </Space>
  );

  const renderNotificationsSection = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Notification Preferences
        </Title>
        <Text type="secondary">
          Control how and when you receive notifications
        </Text>
      </div>

      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={notificationForm}
          layout="vertical"
          onFinish={handleNotificationUpdate}
        >
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Text strong style={{ fontSize: '15px' }}>
                Email Notifications
              </Text>
            </div>

            <Form.Item name="email_notifications" valuePropName="checked" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                }}
              >
                <Space direction="vertical" size={4}>
                  <Text strong style={{ fontSize: '14px' }}>All Email Notifications</Text>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    Master control for all email notifications
                  </Text>
                </Space>
                <Switch />
              </div>
            </Form.Item>

            <Divider />

            <div>
              <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '16px' }}>
                Project Activity
              </Text>

              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {[
                  {
                    title: 'Project Invitations',
                    description: 'When you receive an invitation to join a project',
                  },
                  {
                    title: 'Project Updates',
                    description: 'Changes and updates in projects you\'re a member of',
                  },
                  {
                    title: 'Comments & Mentions',
                    description: 'When someone mentions you or replies to your comments',
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    }}
                  >
                    <Space direction="vertical" size={2}>
                      <Text style={{ fontSize: '14px' }}>{item.title}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {item.description}
                      </Text>
                    </Space>
                    <Switch defaultChecked />
                  </div>
                ))}
              </Space>
            </div>

            <Divider />

            <div>
              <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '16px' }}>
                Workspace Activity
              </Text>

              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {[
                  {
                    title: 'Workspace Invitations',
                    description: 'When you\'re invited to join a workspace',
                  },
                  {
                    title: 'Member Activity',
                    description: 'When members join, leave, or are added to workspaces',
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    }}
                  >
                    <Space direction="vertical" size={2}>
                      <Text style={{ fontSize: '14px' }}>{item.title}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {item.description}
                      </Text>
                    </Space>
                    <Switch defaultChecked />
                  </div>
                ))}
              </Space>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                Save Preferences
              </Button>
            </div>
          </Space>
        </Form>
      </Card>
    </Space>
  );

  const renderPreferencesSection = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Application Preferences
        </Title>
        <Text type="secondary">
          Customize your application experience
        </Text>
      </div>

      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '15px' }}>
              Appearance
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Theme</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Choose your preferred color theme
              </Text>
            </Space>
            <Select
              value={theme}
              onChange={toggleTheme}
              style={{ width: 140 }}
            >
              <Select.Option value="light">Light</Select.Option>
              <Select.Option value="dark">Dark</Select.Option>
            </Select>
          </div>

          <Divider />

          <div>
            <Text strong style={{ fontSize: '15px' }}>
              Language & Region
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Language</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Select your preferred interface language
              </Text>
            </Space>
            <Select defaultValue="en" style={{ width: 140 }}>
              <Select.Option value="en">English</Select.Option>
              <Select.Option value="es">Español</Select.Option>
              <Select.Option value="fr">Français</Select.Option>
            </Select>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Timezone</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Detected from your system settings
              </Text>
            </Space>
            <Text code style={{ fontSize: '13px' }}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Text>
          </div>
        </Space>
      </Card>
    </Space>
  );

  const renderDataSection = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Data & Privacy
        </Title>
        <Text type="secondary">
          Manage your data and privacy settings
        </Text>
      </div>

      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '15px' }}>
              Data Management
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Download Your Data</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Export all your account data in JSON format
              </Text>
            </Space>
            <Button icon={<DownloadOutlined />}>Request Export</Button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Clear Cache</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Clear locally stored temporary data
              </Text>
            </Space>
            <Button icon={<ClearOutlined />}>Clear Cache</Button>
          </div>

          <Divider />

          <div>
            <Text strong style={{ fontSize: '15px' }}>
              Privacy Controls
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Profile Visibility</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Control who can view your profile information
              </Text>
            </Space>
            <Select defaultValue="public" style={{ width: 140 }}>
              <Select.Option value="public">Public</Select.Option>
              <Select.Option value="team">Team Only</Select.Option>
              <Select.Option value="private">Private</Select.Option>
            </Select>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Activity Status</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Show when you're currently online
              </Text>
            </Space>
            <Switch defaultChecked />
          </div>
        </Space>
      </Card>
    </Space>
  );

  const renderDangerSection = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Account Management
        </Title>
        <Text type="secondary">
          Manage critical account actions
        </Text>
      </div>

      <Alert
        message="Important Information"
        description="The actions below are permanent and cannot be reversed. Please proceed with caution and ensure you understand the consequences."
        type="warning"
        showIcon
        style={{ marginBottom: 0 }}
      />

      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div
            style={{
              padding: '24px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? 'rgba(255, 77, 79, 0.3)' : 'rgba(255, 77, 79, 0.2)'}`,
              backgroundColor: isDark ? 'rgba(255, 77, 79, 0.05)' : 'rgba(255, 77, 79, 0.03)',
            }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '8px' }}>
                  Delete Account
                </Text>
                <Text type="secondary" style={{ fontSize: '13px', display: 'block' }}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </Text>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                  This will permanently remove:
                </Text>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                  <li>Your profile and account information</li>
                  <li>All projects you own or collaborate on</li>
                  <li>Workspace memberships and associated data</li>
                  <li>All uploaded datasets and files</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteAccount}
                >
                  Delete My Account
                </Button>
              </div>
            </Space>
          </div>
        </Space>
      </Card>
    </Space>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'account':
        return renderAccountSection();
      case 'security':
        return renderSecuritySection();
      case 'notifications':
        return renderNotificationsSection();
      case 'preferences':
        return renderPreferencesSection();
      case 'data':
        return renderDataSection();
      case 'danger':
        return renderDangerSection();
      default:
        return renderProfileSection();
    }
  };

  if (loading && !profileData) {
    return (
      <MainLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spin size="large" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Layout style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: 'transparent' }}>
        {/* Main Content */}
        <Content
          style={{
            padding: '40px 48px',
            backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
            overflow: 'auto',
          }}
        >
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Settings
            </Text>
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