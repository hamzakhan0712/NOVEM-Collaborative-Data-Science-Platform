import React, { useEffect, useState } from 'react';
import { Badge, Button, Dropdown, List, Typography, Space, Empty, Spin, Tag } from 'antd';
import { BellOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { backendAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Text } = Typography;

interface JoinRequestsBadgeProps {
  projectId?: number;
  onUpdate?: () => void;
}

const JoinRequestsBadge: React.FC<JoinRequestsBadgeProps> = ({ projectId, onUpdate }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const { currentProject } = useProject();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const activeProjectId = projectId || currentProject?.id;

  useEffect(() => {
    if (visible && activeProjectId) {
      loadRequests();
    }
  }, [visible, activeProjectId]);

  const loadRequests = async () => {
    if (!activeProjectId) return;
    
    setLoading(true);
    try {
      const data = await backendAPI.getProjectJoinRequests(activeProjectId);
      setRequests(data);
    } catch (error) {
      console.error('Failed to load join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    if (!activeProjectId) return;
    
    try {
      await backendAPI.approveJoinRequest(activeProjectId, requestId, 'viewer');
      await loadRequests();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!activeProjectId) return;
    
    try {
      await backendAPI.rejectJoinRequest(activeProjectId, requestId);
      await loadRequests();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const dropdownContent = (
    <div
      style={{
        width: 380,
        maxHeight: 500,
        backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
        borderRadius: '4px',
        boxShadow: isDark ? colors.shadowLargeDark : colors.shadowLarge,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Text
          strong
          style={{
            fontSize: '15px',
            color: isDark ? colors.textPrimaryDark : colors.textPrimary,
          }}
        >
          Join Requests
        </Text>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ padding: '40px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text style={{ color: isDark ? colors.textSecondaryDark : colors.textSecondary }}>
                No pending join requests
              </Text>
            }
          />
        </div>
      ) : (
        <List
          dataSource={requests}
          style={{ maxHeight: 400, overflow: 'auto' }}
          renderItem={(request) => (
            <List.Item
              style={{
                padding: '16px',
                borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              }}
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <Text
                      strong
                      style={{
                        color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                      }}
                    >
                      {request.user.first_name} {request.user.last_name}
                    </Text>
                    <br />
                    <Text
                      type="secondary"
                      style={{
                        fontSize: '12px',
                        color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                      }}
                    >
                      {request.user.email}
                    </Text>
                  </div>
                  <Tag color="orange">PENDING</Tag>
                </Space>

                {request.message && (
                  <Text
                    style={{
                      fontSize: '13px',
                      color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                      fontStyle: 'italic',
                    }}
                  >
                    "{request.message}"
                  </Text>
                )}

                <Text
                  type="secondary"
                  style={{
                    fontSize: '12px',
                    color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                  }}
                >
                  Requested {new Date(request.requested_at).toLocaleDateString()}
                </Text>

                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => handleReject(request.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => handleApprove(request.id)}
                  >
                    Approve
                  </Button>
                </Space>
              </Space>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  if (!activeProjectId) return null;

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={visible}
      onOpenChange={setVisible}
      placement="bottomRight"
    >
      <Badge count={requests.length} offset={[-5, 5]}>
        <Button
          icon={<BellOutlined />}
          type="text"
          style={{
            color: isDark ? colors.textPrimaryDark : colors.textSecondary,
          }}
        />
      </Badge>
    </Dropdown>
  );
};

export default JoinRequestsBadge;