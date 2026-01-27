import React, { useState } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Typography,
  Space,
  message,
  Steps,
  Row,
  Col,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  LockOutlined,
  GlobalOutlined,
  EyeOutlined,
  BankOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../theme/config';
import { backendAPI } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const OnboardingPage: React.FC = () => {
  const [form] = Form.useForm();
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const isDark = theme === 'dark';

  const steps = [
    {
      title: 'Profile',
      description: 'Your information',
    },
    {
      title: 'Organization',
      description: 'Work details',
    },
    {
      title: 'Workspace',
      description: 'Setup workspace',
    },
  ];

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['first_name', 'last_name']);
      } else if (currentStep === 1) {
        await form.validateFields(['organization', 'job_title', 'location']);
      }
      setCurrentStep(currentStep + 1);
    } catch (err) {
      console.log('Validation failed:', err);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      console.log('📝 Submitting onboarding:', values);

      // Update Profile
      await backendAPI.updateProfile({
        first_name: values.first_name,
        last_name: values.last_name,
        bio: values.bio || '',
        organization: values.organization || '',
        job_title: values.job_title || '',
        location: values.location || '',
      });

      // Create Workspace
      await backendAPI.createWorkspace({
        name: values.workspace_name,
        workspace_type: values.workspace_type,
        visibility: values.visibility,
        description: values.workspace_description || '',
        allow_member_project_creation: true,
      });

      // Complete Onboarding
      await completeOnboarding();

      setCompleted(true);
      message.success('Setup completed successfully');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error('❌ Onboarding error:', err);
      
      if (err.errorFields) {
        message.error('Please complete all required fields');
        return;
      }

      const errorMessage = err.response?.data?.error 
        || err.response?.data?.name?.[0]
        || err.response?.data?.detail
        || 'Failed to complete setup';
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundSecondary,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            textAlign: 'center',
            padding: '48px 24px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: isDark 
                ? 'rgba(0, 200, 83, 0.1)' 
                : 'rgba(0, 200, 83, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <CheckCircleOutlined
              style={{
                fontSize: '40px',
                color: colors.logoCyan,
              }}
            />
          </div>
          <Title 
            level={2} 
            style={{ 
              marginBottom: '12px',
              fontWeight: 600,
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            Setup Complete
          </Title>
          <Text
            style={{
              fontSize: '15px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Taking you to your dashboard...
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundSecondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <img
                src="/logo.png"
                alt="NOVEM"
                style={{ height: '32px', width: 'auto' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Text
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: colors.logoCyan,
                  letterSpacing: '-0.02em',
                }}
              >
                NOVEM
              </Text>
            </div>
            <Title 
              level={2} 
              style={{ 
                margin: '16px 0 0 0',
                fontWeight: 600,
                fontSize: '28px',
                letterSpacing: '-0.02em',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              Welcome to NOVEM
            </Title>
            <Text
              style={{
                fontSize: '15px',
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              Let's set up your account and workspace
            </Text>
          </Space>
        </div>

        {/* Progress Steps */}
        <Card
          style={{
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            marginBottom: '24px',
          }}
          bodyStyle={{ padding: '32px 40px' }}
        >
          <Steps
            current={currentStep}
            items={steps}
            style={{ marginBottom: '0' }}
          />
        </Card>

        {/* Form Card */}
        <Card
          style={{
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          }}
          bodyStyle={{ padding: '40px' }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              first_name: user?.first_name || '',
              last_name: user?.last_name || '',
              visibility: 'private',
            }}
          >
            {/* Step 1: Profile */}
            {currentStep === 0 && (
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <Title 
                    level={4} 
                    style={{ 
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                    }}
                  >
                    Your Profile
                  </Title>
                  <Text
                    style={{
                      fontSize: '14px',
                      color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                    }}
                  >
                    Tell us about yourself
                  </Text>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="first_name"
                      label={<Text strong>First Name</Text>}
                      rules={[
                        { required: true, message: 'Required' },
                        { min: 2, message: 'Minimum 2 characters' },
                      ]}
                    >
                      <Input 
                        size="large" 
                        placeholder="John"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="last_name"
                      label={<Text strong>Last Name</Text>}
                      rules={[
                        { required: true, message: 'Required' },
                        { min: 2, message: 'Minimum 2 characters' },
                      ]}
                    >
                      <Input 
                        size="large" 
                        placeholder="Doe"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="bio"
                  label={<Text strong>Bio <Text type="secondary">(Optional)</Text></Text>}
                >
                  <TextArea
                    rows={3}
                    placeholder="Brief description about yourself..."
                    maxLength={500}
                    showCount
                    style={{
                      resize: 'none',
                    }}
                  />
                </Form.Item>
              </div>
            )}

            {/* Step 2: Organization */}
            {currentStep === 1 && (
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <Title 
                    level={4} 
                    style={{ 
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                    }}
                  >
                    Organization Details
                  </Title>
                  <Text
                    style={{
                      fontSize: '14px',
                      color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                    }}
                  >
                    Your professional information
                  </Text>
                </div>

                <Form.Item
                  name="organization"
                  label={<Text strong>Organization</Text>}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input 
                    size="large" 
                    placeholder="Acme Corporation"
                    prefix={<BankOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="job_title"
                      label={<Text strong>Job Title</Text>}
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input 
                        size="large" 
                        placeholder="Data Scientist"
                        prefix={<IdcardOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="location"
                      label={<Text strong>Location</Text>}
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input 
                        size="large" 
                        placeholder="San Francisco, CA"
                        prefix={<EnvironmentOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}

            {/* Step 3: Workspace */}
            {currentStep === 2 && (
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <Title 
                    level={4} 
                    style={{ 
                      marginBottom: '8px',
                      fontWeight: 600,
                      color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                    }}
                  >
                    Create Workspace
                  </Title>
                  <Text
                    style={{
                      fontSize: '14px',
                      color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                    }}
                  >
                    Set up your team or personal workspace
                  </Text>
                </div>

                <Form.Item
                  name="workspace_name"
                  label={<Text strong>Workspace Name</Text>}
                  rules={[
                    { required: true, message: 'Required' },
                    { min: 3, message: 'Minimum 3 characters' },
                  ]}
                >
                  <Input
                    size="large"
                    placeholder="My Analytics Team"
                    prefix={<TeamOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="workspace_type"
                      label={<Text strong>Type</Text>}
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Select size="large" placeholder="Select type">
                        <Option value="personal">Personal</Option>
                        <Option value="team">Team</Option>
                        <Option value="organization">Organization</Option>
                        <Option value="client">Client</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="visibility"
                      label={<Text strong>Visibility</Text>}
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Select size="large">
                        <Option value="private">
                          <Space>
                            <LockOutlined />
                            Private
                          </Space>
                        </Option>
                        <Option value="internal">
                          <Space>
                            <EyeOutlined />
                            Internal
                          </Space>
                        </Option>
                        <Option value="public">
                          <Space>
                            <GlobalOutlined />
                            Public
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="workspace_description"
                  label={<Text strong>Description <Text type="secondary">(Optional)</Text></Text>}
                >
                  <TextArea
                    rows={3}
                    placeholder="What will this workspace be used for..."
                    maxLength={500}
                    showCount
                    style={{
                      resize: 'none',
                    }}
                  />
                </Form.Item>
              </div>
            )}

            {/* Navigation Buttons */}
            <div
              style={{
                marginTop: '40px',
                paddingTop: '24px',
                borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <Button
                size="large"
                onClick={handlePrev}
                disabled={currentStep === 0}
                icon={<ArrowLeftOutlined />}
                style={{
                  minWidth: '120px',
                }}
              >
                Previous
              </Button>

              {currentStep < 2 ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={handleNext}
                  icon={<ArrowRightOutlined />}
                  iconPosition="end"
                  style={{
                    minWidth: '120px',
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  onClick={handleSubmit}
                  loading={loading}
                  icon={<CheckCircleOutlined />}
                  iconPosition="end"
                  style={{
                    minWidth: '120px',
                  }}
                >
                  Complete
                </Button>
              )}
            </div>
          </Form>
        </Card>

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
          }}
        >
          <Text
            style={{
              fontSize: '13px',
              color: isDark ? colors.textTertiaryDark : colors.textTertiary,
            }}
          >
            Step {currentStep + 1} of {steps.length}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;