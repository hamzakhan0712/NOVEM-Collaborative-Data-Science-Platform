import React, { useState } from 'react';
import { Form, Input, Button, Typography, Steps } from 'antd';
import { MailOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme/config';

const { Title, Text } = Typography;

const PasswordResetPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const { requestPasswordReset, isOnline } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      setEmail(values.email);
      await requestPasswordReset(values.email);
      setSubmitted(true);
    } catch (error) {
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundPrimary,
        }}
      >
        <div style={{ maxWidth: 500, textAlign: 'center' }}>
          <CheckCircleOutlined
            style={{
              fontSize: 64,
              color: colors.success,
              marginBottom: 32,
            }}
          />
          <Title level={2} style={{ marginBottom: 16 }}>
            Check Your Email
          </Title>
          <Text
            style={{
              fontSize: 15,
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              display: 'block',
              marginBottom: 8,
            }}
          >
            We've sent password reset instructions to
          </Text>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 32, color: colors.logoCyan }}>
            {email}
          </Text>
          <Text
            type="secondary"
            style={{
              fontSize: 14,
              display: 'block',
              marginBottom: 32,
            }}
          >
            The link will expire in 1 hour. If you don't receive the email, check your spam folder.
          </Text>
          <Button type="primary" size="large" onClick={() => navigate('/login')} style={{ height: 44 }}>
            Back to Login
          </Button>
          <div style={{ marginTop: 16 }}>
            <Button type="link" onClick={() => setSubmitted(false)}>
              Didn't receive email? Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundPrimary,
      }}
    >
      {/* Left Panel - Information */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 80px',
          backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
          borderRight: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <Title
            level={2}
            style={{
              fontSize: 32,
              fontWeight: 600,
              marginBottom: 24,
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            Reset Your Password
          </Title>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              display: 'block',
              marginBottom: 48,
            }}
          >
            Enter your email address and we'll send you instructions to reset your password.
          </Text>

          <Steps
            orientation="vertical"
            current={0}
            items={[
              {
                title: 'Enter your email',
                description: 'Provide the email associated with your account',
              },
              {
                title: 'Check your inbox',
                description: "We'll send you reset instructions",
              },
              {
                title: 'Create new password',
                description: 'Follow the link to reset your password',
              },
            ]}
          />
        </div>
      </div>

      {/* Right Panel - Reset Form */}
      <div
        style={{
          width: 520,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 64px',
        }}
      >
        <div style={{ maxWidth: 400, width: '100%' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/login')}
            style={{ marginBottom: 32, padding: '4px 8px' }}
          >
            Back to Login
          </Button>

          <Title level={3} style={{ marginBottom: 8, fontSize: 24 }}>
            Forgot Password?
          </Title>
          <Text
            type="secondary"
            style={{
              fontSize: 14,
              display: 'block',
              marginBottom: 32,
            }}
          >
            No problem, we'll help you reset it.
          </Text>

          <Form name="password-reset" onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Invalid email format' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="name@company.com"
                disabled={!isOnline}
                style={{ height: 44 }}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!isOnline}
                block
                style={{ height: 44, fontWeight: 500 }}
              >
                Send Reset Instructions
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;