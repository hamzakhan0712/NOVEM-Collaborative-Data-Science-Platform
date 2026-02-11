import React, { useState, useEffect } from 'react';
import { Progress, Space, Typography, Tooltip, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { tauriCommands, SystemResources } from '../../types/tauri';

const { Text } = Typography;

const SystemStatus: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    loadSystemStatus();
    const interval = setInterval(loadSystemStatus, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemStatus = async () => {
    try {
      const result = await tauriCommands.getSystemResources();
      setSystemStatus(result);
      setIsAvailable(true);
      setLoading(false);
    } catch (error) {
      console.warn('System resources unavailable:', error);
      setSystemStatus(null);
      setIsAvailable(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '8px 12px', textAlign: 'center' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
      </div>
    );
  }

  if (!isAvailable || !systemStatus) {
    return (
      <Tooltip title="Compute engine is not running" placement="bottom">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: isDark
              ? 'rgba(255, 77, 79, 0.1)'
              : 'rgba(255, 77, 79, 0.08)',
            border: `1px solid ${colors.error}`,
            cursor: 'pointer',
          }}
        >
          <CloseCircleOutlined style={{ color: colors.error, fontSize: '14px' }} />
          <Text
            style={{
              fontSize: '12px',
              color: colors.error,
              fontWeight: 500,
            }}
          >
            Engine Offline
          </Text>
        </div>
      </Tooltip>
    );
  }

  const getCpuColor = () => {
    if (systemStatus.cpu_percent > 80) return colors.error;
    if (systemStatus.cpu_percent > 60) return colors.warning;
    return colors.success;
  };

  const getMemoryColor = () => {
    if (systemStatus.memory_percent > 85) return colors.error;
    if (systemStatus.memory_percent > 70) return colors.warning;
    return colors.success;
  };

  const getTooltipContent = () => {
    return (
      <div style={{ minWidth: '200px' }}>
        <Text strong style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>
          Compute Engine Resources
        </Text>
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>CPU Usage:</Text>
            <Text strong style={{ color: '#fff' }}>{systemStatus.cpu_percent.toFixed(1)}%</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Memory:</Text>
            <Text strong style={{ color: '#fff' }}>
              {systemStatus.memory_available_gb.toFixed(1)}GB / {systemStatus.memory_total_gb.toFixed(1)}GB
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Disk Space:</Text>
            <Text strong style={{ color: '#fff' }}>
              {systemStatus.disk_available_gb.toFixed(1)}GB free
            </Text>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Tooltip title={getTooltipContent()} placement="bottom" overlayStyle={{ maxWidth: '280px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: isDark
            ? 'rgba(82, 196, 26, 0.1)'
            : 'rgba(82, 196, 26, 0.08)',
          border: `1px solid ${colors.success}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          minWidth: '160px',
        }}
      >
        <CheckCircleOutlined style={{ color: colors.success, fontSize: '14px' }} />

        <div style={{ flex: 1 }}>
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            {/* CPU */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <Text
                  style={{
                    fontSize: '11px',
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  CPU
                </Text>
                <Text
                  strong
                  style={{
                    fontSize: '11px',
                    color: getCpuColor(),
                  }}
                >
                  {systemStatus.cpu_percent.toFixed(0)}%
                </Text>
              </div>
              <Progress
                percent={systemStatus.cpu_percent}
                strokeColor={getCpuColor()}
                trailColor={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}
                showInfo={false}
                size="small"
                style={{ margin: 0 }}
              />
            </div>

            {/* Memory */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <Text
                  style={{
                    fontSize: '11px',
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  RAM
                </Text>
                <Text
                  strong
                  style={{
                    fontSize: '11px',
                    color: getMemoryColor(),
                  }}
                >
                  {systemStatus.memory_percent.toFixed(0)}%
                </Text>
              </div>
              <Progress
                percent={systemStatus.memory_percent}
                strokeColor={getMemoryColor()}
                trailColor={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}
                showInfo={false}
                size="small"
                style={{ margin: 0 }}
              />
            </div>
          </Space>
        </div>
      </div>
    </Tooltip>
  );
};

export default SystemStatus;