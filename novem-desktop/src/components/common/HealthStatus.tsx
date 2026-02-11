import React, { useEffect, useState } from 'react';
import { Space, Tooltip, Typography } from 'antd';
import { CloudOutlined, CloudServerOutlined, CheckCircleOutlined, WarningOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { tauriCommands } from '../../types/tauri';

const { Text } = Typography;

interface ServiceStatus {
  backend: 'online' | 'offline' | 'checking';
  computeEngine: 'online' | 'offline' | 'checking';
}

const HealthStatus: React.FC = () => {
  const { theme } = useTheme();
  const [status, setStatus] = useState<ServiceStatus>({
    backend: 'checking',
    computeEngine: 'checking',
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServices = async () => {
    // Check Django backend
    try {
      await tauriCommands.checkBackendHealth();
      setStatus(prev => ({ ...prev, backend: 'online' }));
    } catch (error) {
      console.warn('Backend health check failed:', error);
      setStatus(prev => ({ ...prev, backend: 'offline' }));
    }

    // Check Compute Engine
    try {
      await tauriCommands.checkComputeEngineHealth();
      setStatus(prev => ({ ...prev, computeEngine: 'online' }));
    } catch (error) {
      console.warn('Compute engine health check failed:', error);
      setStatus(prev => ({ ...prev, computeEngine: 'offline' }));
    }
  };

  const getStatusColor = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'online': return colors.success;
      case 'offline': return colors.error;
      default: return colors.textTertiary;
    }
  };

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'online': return <CheckCircleOutlined style={{ fontSize: '14px' }} />;
      case 'offline': return <WarningOutlined style={{ fontSize: '14px' }} />;
      default: return <LoadingOutlined style={{ fontSize: '14px' }} />;
    }
  };

  return (
    <Space size={12}>
      {/* Django Backend Status */}
      <Tooltip 
        title={
          status.backend === 'online' 
            ? 'Coordination server connected' 
            : status.backend === 'checking'
            ? 'Checking coordination server...'
            : 'Coordination server offline - Limited features available'
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <CloudOutlined 
            style={{ 
              fontSize: '14px',
              color: getStatusColor(status.backend)
            }} 
          />
          <Text 
            style={{ 
              fontSize: '12px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              fontWeight: 500,
            }}
          >
            Django
          </Text>
          {getStatusIcon(status.backend)}
        </div>
      </Tooltip>

      {/* Compute Engine Status */}
      <Tooltip 
        title={
          status.computeEngine === 'online' 
            ? 'Local compute engine running' 
            : status.computeEngine === 'checking'
            ? 'Checking compute engine...'
            : 'Local compute engine offline - Analysis unavailable'
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <CloudServerOutlined 
            style={{ 
              fontSize: '14px',
              color: getStatusColor(status.computeEngine)
            }} 
          />
          <Text 
            style={{ 
              fontSize: '12px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              fontWeight: 500,
            }}
          >
            FastAPI
          </Text>
          {getStatusIcon(status.computeEngine)}
        </div>
      </Tooltip>
    </Space>
  );
};

export default HealthStatus;