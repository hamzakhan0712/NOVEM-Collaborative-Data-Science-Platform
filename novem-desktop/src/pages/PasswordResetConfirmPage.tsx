import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Progress } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { backendAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../theme/config';

const { Title, Text } = Typography;

const PasswordResetConfirmPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!uid || !token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [uid, token]);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return colors.error;
    if (passwordStrength < 70) return colors.warning;
    return colors.success;
  };

  const onFinish = async (values: { password: string }) => {
    if (!uid || !token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await backendAPI.resetPassword(uid, token, values.password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
            Password Reset Successful!
          </Title>
          <Text
            style={{
              fontSize: 15,
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              display: 'block',
              marginBottom: 32,
            }}
          >
            Your password has been updated. Redirecting to login...
          </Text>
          <Button type="primary" size="large" onClick={() => navigate('/login')} style={{ height: 44 }}>
            Go to Login Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundPrimary,
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 450, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title
            level={1}
            style={{
              fontSize: 48,
              fontWeight: 700,
              margin: 0,
              marginBottom: 8,
              background: `linear-gradient(135deg, ${colors.logoCyan} 0%, ${colors.logoCyan} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            NOVEM
          </Title>
        </div>

        <Title level={3} style={{ marginBottom: 8, fontSize: 24 }}>
          Create New Password
        </Title>
        <Text
          type="secondary"
          style={{
            fontSize: 14,
            display: 'block',
            marginBottom: 32,
          }}
        >
          Enter your new password below
        </Text>

        {error && (
          <Alert
            message="Reset Failed"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form name="password-reset-confirm" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            label="New Password"
            name="password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Minimum 8 characters' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Must contain uppercase, lowercase, and number',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter new password"
              onChange={(e) => setPasswordStrength(calculatePasswordStrength(e.target.value))}
              style={{ height: 44 }}
              disabled={!uid || !token}
            />
          </Form.Item>

          {passwordStrength > 0 && (
            <div style={{ marginTop: -16, marginBottom: 16 }}>
              <Progress
                percent={passwordStrength}
                strokeColor={getPasswordStrengthColor()}
                showInfo={false}
                strokeWidth={4}
                style={{ marginBottom: 4 }}
              />
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  color: getPasswordStrengthColor(),
                }}
              >
                {passwordStrength < 40 ? 'Weak' : passwordStrength < 70 ? 'Medium' : 'Strong'} password
              </Text>
            </div>
          )}

          <Form.Item
            label="Confirm Password"
            name="password_confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm new password"
              style={{ height: 44 }}
              disabled={!uid || !token}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={!uid || !token}
              block
              style={{ height: 44, fontWeight: 500 }}
            >
              Reset Password
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Remember your password?{' '}
            <a onClick={() => navigate('/login')} style={{ fontWeight: 500, color: colors.info, cursor: 'pointer' }}>
              Back to Login
            </a>
          </Text>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirmPage;