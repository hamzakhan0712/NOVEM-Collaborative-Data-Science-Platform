import React, { useEffect, useState } from 'react';
import { Badge, Button, Dropdown, List, Typography, Space, Empty, Spin, Tag, Avatar, message } from 'antd';
import { BellOutlined, CheckOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { backendAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Text } = Typography;

interface WorkspaceJoinRequestsBadgeProps {
  workspaceId: number;
  onUpdate: () => void;
}

const WorkspaceJoinRequestsBadge: React.FC<WorkspaceJoinRequestsBadgeProps> = ({
  workspaceId,
  onUpdate,
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  useEffect(() => {
    if (visible && workspaceId) {
      loadRequests();
    }
  }, [visible, workspaceId]);

  // Poll for new requests every 30 seconds when dropdown is open
  useEffect(() => {
    if (!visible || !workspaceId) return;

    const interval = setInterval(() => {
      loadRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [visible, workspaceId]);

  // Also load when badge is mounted to show count
  useEffect(() => {
    if (workspaceId) {
      loadRequests();
    }
  }, [workspaceId]);

  const loadRequests = async () => {
    if (!workspaceId) return;

    setLoading(true);
    try {
      console.log('📋 [WorkspaceJoinRequestsBadge] Loading requests for workspace:', workspaceId);
      const data = await backendAPI.getWorkspaceJoinRequests(workspaceId);
      console.log('✅ [WorkspaceJoinRequestsBadge] Loaded', data.length, 'requests');
      setRequests(data || []);
    } catch (error: any) {
      console.error('❌ [WorkspaceJoinRequestsBadge] Failed to load join requests:', error);
      if (!error.offline) {
        message.error('Failed to load join requests');
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number, requestUser: any) => {
    if (!workspaceId) return;

    try {
      console.log('✅ [WorkspaceJoinRequestsBadge] Approving request:', requestId);
      await backendAPI.approveWorkspaceJoinRequest(workspaceId, requestId, 'member');
      message.success(`${requestUser.first_name} ${requestUser.last_name} has been added to the workspace`);
      await loadRequests();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('❌ [WorkspaceJoinRequestsBadge] Failed to approve request:', error);
      message.error(error.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: number, requestUser: any) => {
    if (!workspaceId) return;

    try {
      console.log('❌ [WorkspaceJoinRequestsBadge] Rejecting request:', requestId);
      await backendAPI.rejectWorkspaceJoinRequest(workspaceId, requestId);
      message.success(`Request from ${requestUser.first_name} ${requestUser.last_name} has been rejected`);
      await loadRequests();
    } catch (error: any) {
      console.error('❌ [WorkspaceJoinRequestsBadge] Failed to reject request:', error);
      message.error(error.response?.data?.error || 'Failed to reject request');
    }
  };

  const dropdownContent = (
    <div
      style={{
        width: 420,
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
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text
            strong
            style={{
              fontSize: '15px',
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            Join Requests
          </Text>
          {requests.length > 0 && (
            <Badge
              count={requests.length}
              style={{
                backgroundColor: colors.logoCyan,
              }}
            />
          )}
        </Space>
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
              <Text
                style={{
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  fontSize: '13px',
                }}
              >
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
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Avatar
                    size={40}
                    icon={<UserOutlined />}
                    src={request.user?.profile_picture}
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(0, 200, 83, 0.1)'
                        : 'rgba(0, 200, 83, 0.08)',
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <div>
                        <Text
                          strong
                          style={{
                            fontSize: '14px',
                            display: 'block',
                            color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                            marginBottom: '2px',
                          }}
                        >
                          {request.user?.first_name} {request.user?.last_name}
                        </Text>
                        <Text
                          style={{
                            fontSize: '12px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        >
                          {request.user?.email}
                        </Text>
                      </div>
                      <Tag
                        color="orange"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: 'none',
                        }}
                      >
                        PENDING
                      </Tag>
                    </Space>
                  </div>
                </div>

                {request.message && (
                  <Text
                    style={{
                      fontSize: '13px',
                      color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                      fontStyle: 'italic',
                      display: 'block',
                      padding: '8px 12px',
                      backgroundColor: isDark
                        ? colors.backgroundTertiaryDark
                        : colors.backgroundTertiary,
                      borderRadius: '6px',
                      marginLeft: '52px',
                    }}
                  >
                    "{request.message}"
                  </Text>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginLeft: '52px',
                  }}
                >
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '12px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                    }}
                  >
                    Requested {new Date(request.created_at || Date.now()).toLocaleDateString()}
                  </Text>

                  <Space size={8}>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(request.id, request.user);
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      Reject
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(request.id, request.user);
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      Approve
                    </Button>
                  </Space>
                </div>
              </Space>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  if (!workspaceId) return null;

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

export default WorkspaceJoinRequestsBadge;