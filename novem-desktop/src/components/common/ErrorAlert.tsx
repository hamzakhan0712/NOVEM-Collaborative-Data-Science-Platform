import React from 'react';
import { Alert, Typography } from 'antd';
import { ExclamationCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ErrorAlertProps {
  error?: any;
  title?: string;
  description?: string;
  type?: 'error' | 'warning' | 'info';
  showIcon?: boolean;
  closable?: boolean;
  onClose?: () => void;
  style?: React.CSSProperties;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  title,
  description,
  type = 'error',
  showIcon = true,
  closable = false,
  onClose,
  style,
}) => {
  // Parse error message
  const getErrorMessage = () => {
    if (description) return description;
    if (!error) return 'An unexpected error occurred';

    // Handle axios errors
    if (error.response) {
      const { data, status } = error.response;

      // Handle validation errors
      if (status === 400 && data) {
        if (typeof data === 'object') {
          const errors = Object.entries(data)
            .map(([field, messages]) => {
              const messageArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${messageArray.join(', ')}`;
            })
            .join('; ');
          return errors || 'Validation failed';
        }
        return data.detail || data.message || 'Invalid request';
      }

      // Handle authentication errors
      if (status === 401) {
        return 'Authentication failed. Please login again.';
      }

      // Handle permission errors
      if (status === 403) {
        return 'You do not have permission to perform this action.';
      }

      // Handle not found errors
      if (status === 404) {
        return 'The requested resource was not found.';
      }

      // Handle server errors
      if (status >= 500) {
        return 'Server error occurred. Please try again later.';
      }

      // Default response error
      return data?.detail || data?.message || `Request failed with status ${status}`;
    }

    // Handle network errors
    if (error.request) {
      return 'Unable to connect to server. Please check your internet connection.';
    }

    // Handle other errors
    return error.message || String(error);
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <CloseCircleOutlined />;
      case 'warning':
        return <WarningOutlined />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  return (
    <Alert
      type={type}
      showIcon={showIcon}
      icon={getIcon()}
      message={
        <Text strong style={{ fontSize: 14 }}>
          {title || (type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Information')}
        </Text>
      }
      description={
        <Text style={{ fontSize: 13 }}>
          {getErrorMessage()}
        </Text>
      }
      closable={closable}
      onClose={onClose}
      style={{
        borderRadius: 4,
        ...style,
      }}
    />
  );
};

export default ErrorAlert;