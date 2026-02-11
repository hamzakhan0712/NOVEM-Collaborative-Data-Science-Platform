import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Empty,
  Button,
  Modal,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FolderOutlined,
  MailOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { backendAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import MainLayout from '../components/layout/MainLayout';
import { colors } from '../theme/config';

const { Title, Text } = Typography;

const MyInvitationsPage: React.FC = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const data = await backendAPI.getMyInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitation: any) => {
    Modal.confirm({
      title: 'Accept Invitation',
      content: `Accept invitation to join "${invitation.project_name}" as ${invitation.role}?`,
      okText: 'Accept',
      onOk: async () => {
        try {
          await backendAPI.acceptInvitation(invitation.project, invitation.id);
          message.success('Invitation accepted! Redirecting to project...');
          setTimeout(() => navigate(`/projects/${invitation.project}`), 1500);
        } catch (error: any) {
          message.error(error.response?.data?.error || 'Failed to accept invitation');
        }
      },
    });
  };

  const handleDecline = async (invitation: any) => {
    Modal.confirm({
      title: 'Decline Invitation',
      content: `Are you sure you want to decline the invitation to "${invitation.project_name}"?`,
      okText: 'Decline',
      okType: 'danger',
      onOk: async () => {
        try {
          await backendAPI.declineInvitation(invitation.project, invitation.id);
          message.success('Invitation declined');
          loadInvitations();
        } catch (error) {
          message.error('Failed to decline invitation');
        }
      },
    });
  };

  const getStatusIcon = (status: string, isExpired: boolean) => {
    if (isExpired) return <ClockCircleOutlined />;
    switch (status) {
      case 'pending':
        return <MailOutlined />;
      case 'accepted':
        return <CheckCircleOutlined />;
      case 'declined':
        return <CloseCircleOutlined />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string, isExpired: boolean) => {
    if (isExpired) return 'default';
    switch (status) {
      case 'pending':
        return 'blue';
      case 'accepted':
        return 'green';
      case 'declined':
        return 'red';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string, isExpired: boolean) => {
    if (isExpired) return 'EXPIRED';
    return status.toUpperCase();
  };

  const columns = [
    {
      title: 'Project',
      key: 'project',
      render: (_: any, record: any) => (
        <Space>
          <FolderOutlined style={{ fontSize: '20px', color: colors.logoCyan }} />
          <Text strong>{record.project_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color="purple">{role.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Invited By',
      key: 'inviter',
      render: (_: any, record: any) => (
        <div>
          <Text strong>
            {record.inviter.first_name} {record.inviter.last_name}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.inviter.email}
          </Text>
        </div>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => (
        <Text style={{ fontStyle: message ? 'normal' : 'italic' }}>
          {message || 'No message'}
        </Text>
      ),
      ellipsis: true,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => (
        <Tag 
          color={getStatusColor(record.status, record.is_expired)} 
          icon={getStatusIcon(record.status, record.is_expired)}
        >
          {getStatusText(record.status, record.is_expired)}
        </Tag>
      ),
    },
    {
      title: 'Invited',
      dataIndex: 'invited_at',
      key: 'invited_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string, record: any) => {
        if (record.status !== 'pending') return '-';
        return new Date(date).toLocaleDateString();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => {
        if (record.status !== 'pending' || record.is_expired) {
          return null;
        }
        return (
          <Space>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleDecline(record)}
            >
              Decline
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleAccept(record)}
            >
              Accept
            </Button>
          </Space>
        );
      },
    },
  ];

  const pendingInvitations = invitations.filter(
    inv => inv.status === 'pending' && !inv.is_expired
  );

  return (
    <MainLayout>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title
            level={2}
            style={{
              margin: 0,
              marginBottom: '8px',
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            My Invitations
          </Title>
          <Text
            style={{
              fontSize: '15px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Review and respond to project invitations
          </Text>
        </div>

        {pendingInvitations.length > 0 && (
          <Card
            variant="borderless"
            style={{
              marginBottom: '16px',
              backgroundColor: '#e6f7ff',
              borderLeft: `4px solid ${colors.info}`,
            }}
          >
            <Space>
              <MailOutlined style={{ fontSize: '20px', color: colors.info }} />
              <Text strong>
                You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''}
              </Text>
            </Space>
          </Card>
        )}

        <Card
          variant="borderless"
          style={{
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          }}
        >
          {invitations.length === 0 && !loading ? (
            <Empty
              description="You haven't received any project invitations yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                onClick={() => navigate('/projects')}
              >
                Browse Projects
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={invitations}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default MyInvitationsPage;