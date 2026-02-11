import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Card,
  Statistic,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Typography,
  Breadcrumb,
  Dropdown,
  MenuProps,
  Alert,
  Spin,
} from 'antd';
import {
  HomeOutlined,
  FolderOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined,
  MoreOutlined,
  RobotOutlined,
  WifiOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { backendAPI } from '../services/api';
import { storageManager } from '../services/offline';
import MainLayout from '../components/layout/MainLayout';
import ProjectOverviewTab from '../components/projects/ProjectOverviewTab';
import ProjectTeamTab from '../components/projects/ProjectTeamTab';
import ProjectSettingsTab from '../components/projects/ProjectSettingsTab';
import JoinRequestsBadge from '../components/projects/JoinRequestsBadge';
import { colors } from '../theme/config';

const { Title, Text } = Typography;

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, refreshProject } = useProject();
  const { offlineMode } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const isDark = theme === 'dark';

  useEffect(() => {
    if (id) {
      loadProject(parseInt(id));
    }
  }, [id, offlineMode]);

  const loadProject = async (projectId: number) => {
    setLoading(true);
    try {
      console.log('📂 [ProjectDetail] Loading project:', projectId, { offlineMode });
      
      // Always try to load from cache first
      const cached = await storageManager.getLocalProjects();
      const cachedProject = cached.find(p => p.id === projectId);
      
      if (cachedProject) {
        console.log('✅ [ProjectDetail] Found cached project');
        setCurrentProject(cachedProject);
        setLoading(false);
      }

      // If online, fetch fresh data in background
      if (!offlineMode) {
        console.log('🌐 [ProjectDetail] Fetching fresh data from API...');
        try {
          const project = await backendAPI.getProject(projectId);
          console.log('✅ [ProjectDetail] Received fresh project data');
          setCurrentProject(project);
          
          // Update cache
          await storageManager.syncProjectState(project);
        } catch (apiError: any) {
          console.warn('⚠️ [ProjectDetail] API fetch failed:', apiError);
          
          // If we don't have cached data, navigate back
          if (!cachedProject) {
            navigate('/projects');
          }
        }
      } else {
        console.log('📴 [ProjectDetail] Offline mode - using cached data only');
        
        // If no cached data in offline mode, navigate back
        if (!cachedProject) {
          navigate('/projects');
        }
      }
    } catch (error) {
      console.error('❌ [ProjectDetail] Load failed:', error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const projectMenuItems: MenuProps['items'] = [
    {
      key: 'refresh',
      label: 'Refresh',
      onClick: () => currentProject && refreshProject(currentProject.id),
      disabled: offlineMode,
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      label: 'Project Settings',
      icon: <SettingOutlined />,
      onClick: () => setActiveTab('settings'),
    },
  ];

  const tabs = currentProject
    ? [
        {
          key: 'overview',
          label: 'Overview',
          icon: <HomeOutlined />,
          children: <ProjectOverviewTab project={currentProject} />,
        },
        {
          key: 'team',
          label: 'Team',
          icon: <TeamOutlined />,
          children: (
            <ProjectTeamTab
              project={currentProject}
              onUpdate={() => currentProject && refreshProject(currentProject.id)}
            />
          ),
        },
        {
          key: 'settings',
          label: 'Settings',
          icon: <SettingOutlined />,
          children: <ProjectSettingsTab project={currentProject} />,
        },
      ]
    : [];

  if (loading || !currentProject) {
    return (
      <MainLayout>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} size="large" />
          <Text
            style={{
              fontSize: '14px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Loading project...
          </Text>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Offline Banner */}
        {offlineMode && (
          <Alert
            message="Offline Mode"
            description="You're viewing cached project data. Some features are limited while offline."
            type="warning"
            icon={<WifiOutlined />}
            showIcon
            closable
            style={{ marginBottom: '24px', borderRadius: '8px' }}
          />
        )}

        <Breadcrumb style={{ marginBottom: '16px' }}>
          <Breadcrumb.Item onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <HomeOutlined />
          </Breadcrumb.Item>
          <Breadcrumb.Item onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
            Projects
          </Breadcrumb.Item>
          <Breadcrumb.Item>{currentProject.name}</Breadcrumb.Item>
        </Breadcrumb>

        <div
          style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <Space orientation="vertical" size="small">
            <Space align="center">
              <FolderOutlined style={{ fontSize: '32px', color: colors.logoCyan }} />
              <Title level={2} style={{ margin: 0 }}>
                {currentProject.name}
              </Title>
              <Tag color="blue">{currentProject.current_user_role}</Tag>
              {offlineMode && (
                <Tag icon={<WifiOutlined />} color="warning">
                  Offline
                </Tag>
              )}
            </Space>
            <Text type="secondary">{currentProject.description || 'No description'}</Text>
            <Space wrap>
              <Tag
                color={
                  currentProject.visibility === 'private'
                    ? 'red'
                    : currentProject.visibility === 'team'
                    ? 'blue'
                    : 'green'
                }
              >
                {currentProject.visibility}
              </Tag>
              {currentProject.workspace_name && (
                <Tag icon={<TeamOutlined />}>{currentProject.workspace_name}</Tag>
              )}
              {currentProject.tags?.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Space>

          <Space>
            {/* Join Requests Badge - Only visible online and with permissions */}
            {!offlineMode && currentProject.current_user_permissions?.can_invite_members && (
              <JoinRequestsBadge
                projectId={currentProject.id}
                onUpdate={() => refreshProject(currentProject.id)}
              />
            )}

            <Dropdown menu={{ items: projectMenuItems }} trigger={['click']}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Datasets"
                value={currentProject.dataset_count || 0}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Team Members"
                value={currentProject.member_count || 0}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic title="Analyses" value={0} prefix={<BarChartOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic title="Models" value={0} prefix={<RobotOutlined />} />
            </Card>
          </Col>
        </Row>

        <Card
          variant="borderless"
          style={{
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          }}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
        </Card>
      </div>
    </MainLayout>
  );
};

export default ProjectDetailPage;