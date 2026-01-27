import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Empty,
  Button,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { backendAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import MainLayout from '../components/layout/MainLayout';
import { colors } from '../theme/config';

const { Title, Text } = Typography;

const MyJoinRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await backendAPI.getMyJoinRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined />;
      case 'approved':
        return <CheckCircleOutlined />;
      case 'rejected':
        return <CloseCircleOutlined />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      default:
        return 'default';
    }
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
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => (
        <Text style={{ fontStyle: message ? 'normal' : 'italic' }}>
          {message || 'No message provided'}
        </Text>
      ),
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Requested',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Reviewed',
      key: 'reviewed',
      render: (_: any, record: any) => {
        if (record.status === 'pending') {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space direction="vertical" size={0}>
            <Text>{new Date(record.reviewed_at).toLocaleDateString()}</Text>
            {record.reviewed_by_name && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                by {record.reviewed_by_name}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => {
        if (record.status === 'approved') {
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => navigate(`/projects/${record.project}`)}
            >
              View Project
            </Button>
          );
        }
        return null;
      },
    },
  ];

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
            My Join Requests
          </Title>
          <Text
            style={{
              fontSize: '15px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Track your project join requests and their status
          </Text>
        </div>

        <Card
          bordered={false}
          style={{
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          }}
        >
          {requests.length === 0 && !loading ? (
            <Empty
              description="You haven't requested to join any projects yet"
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
              dataSource={requests}
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

export default MyJoinRequestsPage;