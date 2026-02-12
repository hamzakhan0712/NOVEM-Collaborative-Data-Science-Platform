import React, { useEffect, useState } from 'react';
import { Space, Typography, Tooltip, Progress } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloudOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/config';
import { tauriCommands, SystemResources, HealthResponse, isTauri } from '../../types/tauri';
import { backendAPI } from '../../services/api';

const { Text } = Typography;

interface ServiceHealth {
  backend: {
    status: 'online' | 'offline' | 'checking';
    message?: string;
    data?: HealthResponse;
  };
  computeEngine: {
    status: 'online' | 'offline' | 'checking';
    message?: string;
    data?: HealthResponse;
  };
}

const StatusBar: React.FC = () => {
  const { theme } = useTheme();
  const { offlineMode, daysRemaining } = useAuth();
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>({
    backend: { status: 'checking' },
    computeEngine: { status: 'checking' },
  });
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [isTauriEnv, setIsTauriEnv] = useState<boolean>(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    // Detect Tauri environment
    const checkEnvironment = () => {
      const isInTauri = isTauri;
      setIsTauriEnv(isInTauri);
      
      if (isInTauri) {
        console.log('Running in Tauri desktop environment');
      } else {
        console.warn('Running in browser mode - Tauri features unavailable');
      }
    };

    checkEnvironment();

    // Initial check with slight delay to ensure Tauri is ready
    setTimeout(() => {
      checkAllServices();
    }, 500);

    // Set up polling interval
    const interval = setInterval(checkAllServices, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [isTauriEnv]);

  const checkAllServices = async () => {
    const checkTime = new Date();
    
    if (isTauri) {
      // Running in Tauri - use Rust commands
      console.log('🔍 Checking services via Tauri commands...');
      
      // Check Backend via Tauri
      try {
        const backendHealth = await tauriCommands.checkBackendHealth();
        console.log('Backend health:', backendHealth);
        setServiceHealth((prev) => ({
          ...prev,
          backend: {
            status: 'online',
            message: `Connected • ${backendHealth.database || 'Database OK'}`,
            data: backendHealth,
          },
        }));
      } catch (error) {
        console.error('Backend health check failed:', error);
        setServiceHealth((prev) => ({
          ...prev,
          backend: {
            status: 'offline',
            message: error instanceof Error ? error.message : 'Connection failed',
          },
        }));
      }

      // Check Compute Engine via Tauri
      try {
        const engineHealth = await tauriCommands.checkComputeEngineHealth();
        console.log('Compute engine health:', engineHealth);
        setServiceHealth((prev) => ({
          ...prev,
          computeEngine: {
            status: 'online',
            message: `Running • ${engineHealth.database || 'DuckDB OK'}`,
            data: engineHealth,
          },
        }));

        // Get system resources if engine is online
        try {
          const resources = await tauriCommands.getSystemResources();
          console.log('System resources:', resources);
          setSystemResources(resources);
        } catch (resError) {
          console.warn('Failed to get system resources:', resError);
          setSystemResources(null);
        }
      } catch (error) {
        console.error('Compute engine health check failed:', error);
        setServiceHealth((prev) => ({
          ...prev,
          computeEngine: {
            status: 'offline',
            message: error instanceof Error ? error.message : 'Not running',
          },
        }));
        setSystemResources(null);
      }
    } else {
      // Running in Browser - use direct API calls
      console.log('Checking services via browser API calls...');
      
      try {
        const isOnline = await backendAPI.checkHealth();
        setServiceHealth((prev) => ({
          ...prev,
          backend: {
            status: isOnline ? 'online' : 'offline',
            message: isOnline ? 'Connected' : 'Connection failed',
          },
        }));
      } catch (error) {
        setServiceHealth((prev) => ({
          ...prev,
          backend: {
            status: 'offline',
            message: 'Connection failed',
          },
        }));
      }

      // In browser mode, compute engine check via direct HTTP
      try {
        const response = await fetch('http://127.0.0.1:8001/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const data = await response.json();
          setServiceHealth((prev) => ({
            ...prev,
            computeEngine: {
              status: 'online',
              message: 'Running locally',
              data: data as HealthResponse,
            },
          }));
        } else {
          throw new Error('FastAPI not responding');
        }
      } catch (error) {
        setServiceHealth((prev) => ({
          ...prev,
          computeEngine: {
            status: 'offline',
            message: 'Only available in desktop app',
          },
        }));
      }
      
      setSystemResources(null);
    }

    setLastCheck(checkTime);
  };

  const getStatusIcon = (status: 'online' | 'offline' | 'checking') => {
    switch (status) {
      case 'online':
        return <CheckCircleOutlined style={{ color: colors.success, fontSize: '12px' }} />;
      case 'offline':
        return <CloseCircleOutlined style={{ color: colors.error, fontSize: '12px' }} />;
      default:
        return <LoadingOutlined style={{ color: colors.textTertiary, fontSize: '12px' }} />;
    }
  };

  const getResourceColor = (percent: number) => {
    if (percent > 85) return colors.error;
    if (percent > 70) return colors.warning;
    return colors.success;
  };

  const formatBytes = (gb: number) => {
    if (gb < 1) return `${(gb * 1024).toFixed(0)}MB`;
    return `${gb.toFixed(1)}GB`;
  };

  return (
    <div
      style={{
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
        borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        fontSize: '12px',
        userSelect: 'none',
      }}
    >
      {/* Left Section - Service Status */}
      <Space size={16}>
        {/* Environment Indicator */}
        {!isTauri && (
          <Tooltip title="Running in browser mode - desktop features unavailable" placement="top">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: isDark
                  ? 'rgba(250, 173, 20, 0.15)'
                  : 'rgba(250, 173, 20, 0.1)',
                border: `1px solid ${colors.warning}`,
              }}
            >
              <ExclamationCircleOutlined style={{ fontSize: '12px', color: colors.warning }} />
              <Text
                style={{
                  fontSize: '11px',
                  color: colors.warning,
                  fontWeight: 600,
                }}
              >
                Browser Mode
              </Text>
            </div>
          </Tooltip>
        )}

        {isTauri && (
          <Tooltip title="Running in Tauri desktop app" placement="top">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: isDark
                  ? 'rgba(82, 196, 26, 0.15)'
                  : 'rgba(82, 196, 26, 0.1)',
                border: `1px solid ${colors.success}`,
              }}
            >
              <CheckCircleOutlined style={{ fontSize: '12px', color: colors.success }} />
              <Text
                style={{
                  fontSize: '11px',
                  color: colors.success,
                  fontWeight: 600,
                }}
              >
                Desktop App
              </Text>
            </div>
          </Tooltip>
        )}

        {/* Backend Status */}
        <Tooltip
          title={
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Django Backend</div>
              <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                Status: {serviceHealth.backend.status}
              </div>
              {serviceHealth.backend.message && (
                <div style={{ color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
                  {serviceHealth.backend.message}
                </div>
              )}
              {serviceHealth.backend.data?.timestamp && (
                <div style={{ color: 'rgba(255,255,255,0.45)', marginTop: '4px', fontSize: '11px' }}>
                  Last check: {new Date(serviceHealth.backend.data.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          }
          placement="top"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.02)';
            }}
          >
            <CloudOutlined style={{ fontSize: '12px', color: isDark ? colors.textSecondaryDark : colors.textSecondary }} />
            <Text
              style={{
                fontSize: '11px',
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                fontWeight: 500,
              }}
            >
              Django
            </Text>
            {getStatusIcon(serviceHealth.backend.status)}
          </div>
        </Tooltip>

        {/* Compute Engine Status */}
        <Tooltip
          title={
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>FastAPI Compute Engine</div>
              <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                Status: {serviceHealth.computeEngine.status}
              </div>
              {serviceHealth.computeEngine.message && (
                <div style={{ color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
                  {serviceHealth.computeEngine.message}
                </div>
              )}
              {serviceHealth.computeEngine.data?.timestamp && (
                <div style={{ color: 'rgba(255,255,255,0.45)', marginTop: '4px', fontSize: '11px' }}>
                  Last check: {new Date(serviceHealth.computeEngine.data.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          }
          placement="top"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.02)';
            }}
          >
            <CloudServerOutlined style={{ fontSize: '12px', color: isDark ? colors.textSecondaryDark : colors.textSecondary }} />
            <Text
              style={{
                fontSize: '11px',
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                fontWeight: 500,
              }}
            >
              FastAPI
            </Text>
            {getStatusIcon(serviceHealth.computeEngine.status)}
          </div>
        </Tooltip>

        {/* Divider */}
        {systemResources && (
          <div
            style={{
              height: '16px',
              width: '1px',
              backgroundColor: isDark ? colors.borderDark : colors.border,
            }}
          />
        )}

        {/* System Resources */}
        {systemResources && (
          <Tooltip
            title={
              <div style={{ fontSize: '12px', minWidth: '200px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>System Resources</div>
                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)' }}>CPU Usage</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{systemResources.cpu_percent.toFixed(1)}%</span>
                    </div>
                    <Progress
                      percent={systemResources.cpu_percent}
                      strokeColor={getResourceColor(systemResources.cpu_percent)}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)' }}>Memory</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>
                        {formatBytes(systemResources.memory_total_gb - systemResources.memory_available_gb)} / {formatBytes(systemResources.memory_total_gb)}
                      </span>
                    </div>
                    <Progress
                      percent={systemResources.memory_percent}
                      strokeColor={getResourceColor(systemResources.memory_percent)}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
                    Disk Available: {formatBytes(systemResources.disk_available_gb)}
                  </div>
                </Space>
              </div>
            }
            placement="top"
          >
            <Space size={4} style={{ cursor: 'pointer' }}>
              <DatabaseOutlined style={{ fontSize: '12px', color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />
              <Text
                style={{
                  fontSize: '11px',
                  color: systemResources.cpu_percent > 80
                    ? colors.error
                    : systemResources.cpu_percent > 60
                    ? colors.warning
                    : isDark
                    ? colors.textTertiaryDark
                    : colors.textTertiary,
                  fontWeight: 500,
                }}
              >
                CPU {systemResources.cpu_percent.toFixed(0)}%
              </Text>
              <Text
                style={{
                  fontSize: '11px',
                  color: systemResources.memory_percent > 85
                    ? colors.error
                    : systemResources.memory_percent > 70
                    ? colors.warning
                    : isDark
                    ? colors.textTertiaryDark
                    : colors.textTertiary,
                  fontWeight: 500,
                  marginLeft: '8px',
                }}
              >
                RAM {systemResources.memory_percent.toFixed(0)}%
              </Text>
            </Space>
          </Tooltip>
        )}
      </Space>

      {/* Right Section - Offline Mode & Status */}
      <Space size={12}>
        {/* Offline Mode Warning */}
        {offlineMode && (
          <Tooltip
            title={`Offline mode: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining until account suspension`}
            placement="top"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: isDark
                  ? 'rgba(250, 173, 20, 0.15)'
                  : 'rgba(250, 173, 20, 0.1)',
                border: `1px solid ${colors.warning}`,
              }}
            >
              <WarningOutlined style={{ fontSize: '12px', color: colors.warning }} />
              <Text
                style={{
                  fontSize: '11px',
                  color: colors.warning,
                  fontWeight: 600,
                }}
              >
                Offline ({daysRemaining}d)
              </Text>
            </div>
          </Tooltip>
        )}

        {/* Last Check Time */}
        <Tooltip title="Last health check" placement="top">
          <Space size={4}>
            <InfoCircleOutlined style={{ fontSize: '11px', color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />
            <Text
              style={{
                fontSize: '11px',
                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
              }}
            >
              {lastCheck.toLocaleTimeString()}
            </Text>
          </Space>
        </Tooltip>
      </Space>
    </div>
  );
};

export default StatusBar;