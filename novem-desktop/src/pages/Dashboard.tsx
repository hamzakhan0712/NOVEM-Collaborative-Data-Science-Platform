import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  List,
  Empty,
  Spin,
  Statistic,
  Badge,
  Divider,
} from 'antd';
import {
  ProjectOutlined,
  FolderOutlined,
  TeamOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  RocketOutlined,
  TrophyOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import { colors } from '../theme/config';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [createProjectVisible, setCreateProjectVisible] = useState(false);
  const { workspaces, currentWorkspace, loading: workspacesLoading } = useWorkspace();
  const { projects, loadProjects, loading: projectsLoading } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  // FIXED: Load projects when workspace changes with workspace ID
  useEffect(() => {
    if (currentWorkspace?.id) {
      console.log('  [Dashboard] Loading projects for workspace:', {
        id: currentWorkspace.id,
        name: currentWorkspace.name,
      });
      loadProjects(currentWorkspace.id); // FIXED: Pass workspace ID
    } else {
      console.log('⏸️ [Dashboard] No current workspace selected');
    }
  }, [currentWorkspace?.id]); // FIXED: Only depend on workspace ID

  // FIXED: Ensure projects is always an array
  const projectsList = Array.isArray(projects) ? projects : [];
  const workspaceList = Array.isArray(workspaces) ? workspaces : [];

  // FIXED: Filter projects by current workspace ID
  const workspaceProjects = currentWorkspace
    ? projectsList.filter((p) => p.workspace === currentWorkspace.id)
    : [];

  const recentProjects = workspaceProjects
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // Calculate stats
  const activeProjects = workspaceProjects.filter((p) => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate <= 7;
  }).length;

  const completedProjects = 0; // TODO: Add completion tracking
  const totalAnalyses = 0; // TODO: Add analysis tracking

  console.log('  [Dashboard] State:', {
    currentWorkspaceId: currentWorkspace?.id,
    currentWorkspaceName: currentWorkspace?.name,
    allProjectsCount: projectsList.length,
    workspaceProjectsCount: workspaceProjects.length,
    recentProjectsCount: recentProjects.length,
    projectsIsArray: Array.isArray(projects),
    workspacesLoading,
    projectsLoading,
  });

  // Loading state
  if (workspacesLoading) {
    return (
      <MainLayout>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <Spin size="large" />
          <Text
            style={{
              fontSize: '15px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Loading your workspace...
          </Text>
        </div>
      </MainLayout>
    );
  }

  // No workspaces state
  if (workspaceList.length === 0) {
    return (
      <MainLayout>
        <div
          style={{
            padding: '80px 32px',
            maxWidth: '600px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: isDark
                ? 'rgba(0, 200, 83, 0.1)'
                : 'rgba(0, 200, 83, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <TeamOutlined style={{ fontSize: '36px', color: colors.logoCyan }} />
          </div>

          <Title level={2} style={{ marginBottom: '12px', fontWeight: 600 }}>
            Welcome to NOVEM
          </Title>
          <Text
            style={{
              fontSize: '15px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              display: 'block',
              marginBottom: '32px',
            }}
          >
            Get started by creating your first workspace to organize your data science projects
          </Text>

          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate('/workspaces')}
            style={{ height: '44px', padding: '0 32px', fontSize: '15px' }}
          >
            Create Workspace
          </Button>
        </div>
      </MainLayout>
    );
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const handleProjectCreated = async () => {
    console.log(' [Dashboard] Project created, reloading...');
    setCreateProjectVisible(false);
    if (currentWorkspace?.id) {
      await loadProjects(currentWorkspace.id); // FIXED: Pass workspace ID
    }
  };

  return (
    <MainLayout>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '32px' }}>
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '28px',
                letterSpacing: '-0.02em',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              Good {getTimeOfDay()}, {user?.first_name || user?.username}
            </Title>
            <Space size={8} align="center">
              <Text
                style={{
                  fontSize: '15px',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                }}
              >
                {currentWorkspace?.name || 'No workspace selected'}
              </Text>
              {currentWorkspace && (
                <>
                  <Divider
                    orientation="vertical"
                    style={{
                      borderColor: isDark ? colors.borderDark : colors.border,
                      margin: '0 4px',
                    }}
                  />
                  <Badge
                    status={
                      currentWorkspace.current_user_permissions?.is_owner
                        ? 'success'
                        : currentWorkspace.current_user_permissions?.is_admin
                        ? 'processing'
                        : 'default'
                    }
                    text={
                      <Text
                        style={{
                          fontSize: '13px',
                          color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                          textTransform: 'capitalize',
                        }}
                      >
                        {currentWorkspace.current_user_role}
                      </Text>
                    }
                  />
                </>
              )}
            </Space>
          </Space>
        </div>

        {/* Stats Grid */}
        <Row gutter={[20, 20]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="borderless"
              style={{
                backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                height: '100%',
              }}
              styles={{ body: { padding: '20px' } }}
            >
              <Statistic
                title={
                  <Text
                    style={{
                      fontSize: '12px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 500,
                    }}
                  >
                    Total Projects
                  </Text>
                }
                value={workspaceProjects.length}
                prefix={
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      backgroundColor: isDark
                        ? 'rgba(5, 226, 97, 0.1)'
                        : 'rgba(0, 200, 83, 0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                    }}
                  >
                    <FolderOutlined style={{ fontSize: '18px', color: colors.logoCyan }} />
                  </div>
                }
                valueStyle={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="borderless"
              style={{
                backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                height: '100%',
              }}
              styles={{ body: { padding: '20px' } }}
            >
              <Statistic
                title={
                  <Text
                    style={{
                      fontSize: '12px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 500,
                    }}
                  >
                    Active Projects
                  </Text>
                }
                value={activeProjects}
                suffix={
                  <Text
                    style={{
                      fontSize: '14px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                      fontWeight: 400,
                    }}
                  >
                    / {workspaceProjects.length}
                  </Text>
                }
                prefix={
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      backgroundColor: isDark
                        ? 'rgba(24, 144, 255, 0.1)'
                        : 'rgba(24, 144, 255, 0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                    }}
                  >
                    <RocketOutlined style={{ fontSize: '18px', color: colors.info }} />
                  </div>
                }
                valueStyle={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="borderless"
              style={{
                backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                height: '100%',
              }}
              styles={{ body: { padding: '20px' } }}
            >
              <Statistic
                title={
                  <Text
                    style={{
                      fontSize: '12px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 500,
                    }}
                  >
                    Team Members
                  </Text>
                }
                value={currentWorkspace?.member_count || 0}
                prefix={
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      backgroundColor: isDark
                        ? 'rgba(250, 173, 20, 0.1)'
                        : 'rgba(250, 173, 20, 0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                    }}
                  >
                    <TeamOutlined style={{ fontSize: '18px', color: colors.warning }} />
                  </div>
                }
                valueStyle={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="borderless"
              style={{
                backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                height: '100%',
              }}
              styles={{ body: { padding: '20px' } }}
            >
              <Statistic
                title={
                  <Text
                    style={{
                      fontSize: '12px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 500,
                    }}
                  >
                    Analyses Run
                  </Text>
                }
                value={totalAnalyses}
                prefix={
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      backgroundColor: isDark
                        ? 'rgba(114, 46, 209, 0.1)'
                        : 'rgba(114, 46, 209, 0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                    }}
                  >
                    <BarChartOutlined style={{ fontSize: '18px', color: '#722ED1' }} />
                  </div>
                }
                valueStyle={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content Grid */}
        <Row gutter={[20, 20]}>
          {/* Recent Projects - 2/3 width */}
          <Col xs={24} lg={16}>
            <Card
              variant="borderless"
              style={{
                backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              }}
              bodyStyle={{ padding: 0 }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space size={10}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: isDark
                        ? 'rgba(0, 200, 83, 0.1)'
                        : 'rgba(0, 200, 83, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ClockCircleOutlined style={{ fontSize: '16px', color: colors.logoCyan }} />
                  </div>
                  <Text strong style={{ fontSize: '15px', fontWeight: 600 }}>
                    Recent Projects
                  </Text>
                </Space>

                <Button
                  type="text"
                  size="small"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/projects')}
                  style={{
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  View All
                </Button>
              </div>

              {/* Card Content */}
              <div style={{ padding: '12px' }}>
                {projectsLoading ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <Spin size="large" />
                    <Text
                      style={{
                        display: 'block',
                        marginTop: '16px',
                        fontSize: '14px',
                        color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                      }}
                    >
                      Loading projects...
                    </Text>
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <Space orientation="vertical" size={8}>
                          <Text
                            strong
                            style={{
                              fontSize: '15px',
                              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                            }}
                          >
                            No projects yet
                          </Text>
                          <Text
                            style={{
                              fontSize: '13px',
                              color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                            }}
                          >
                            Create your first project to get started with data analysis
                          </Text>
                        </Space>
                      }
                    >
                      {currentWorkspace?.current_user_permissions?.can_create_projects !==
                        false && (
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setCreateProjectVisible(true)}
                          style={{ marginTop: '16px', height: '40px', padding: '0 24px' }}
                        >
                          Create Project
                        </Button>
                      )}
                    </Empty>
                  </div>
                ) : (
                  <List
                    dataSource={recentProjects}
                    renderItem={(project) => (
                      <List.Item
                        style={{
                          padding: '16px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          border: '1px solid transparent',
                          transition: 'all 0.15s ease',
                          marginBottom: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark
                            ? colors.hoverDark
                            : colors.hover;
                          e.currentTarget.style.borderColor = isDark
                            ? colors.borderDark
                            : colors.border;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            width: '100%',
                          }}
                        >
                          {/* Icon */}
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              backgroundColor: isDark
                                ? 'rgba(0, 200, 83, 0.1)'
                                : 'rgba(0, 200, 83, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <ProjectOutlined
                              style={{ fontSize: '18px', color: colors.logoCyan }}
                            />
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              strong
                              style={{
                                fontSize: '14px',
                                display: 'block',
                                marginBottom: '4px',
                                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                                fontWeight: 500,
                              }}
                            >
                              {project.name}
                            </Text>
                            <Text
                              style={{
                                fontSize: '13px',
                                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {project.description || 'No description'}
                            </Text>
                          </div>

                          {/* Meta */}
                          <div
                            style={{
                              textAlign: 'right',
                              flexShrink: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '6px',
                            }}
                          >
                            <Badge
                              status={
                                project.current_user_role === 'lead'
                                  ? 'success'
                                  : project.current_user_role === 'contributor'
                                  ? 'processing'
                                  : 'default'
                              }
                              text={
                                <Text
                                  style={{
                                    fontSize: '12px',
                                    textTransform: 'capitalize',
                                    fontWeight: 500,
                                  }}
                                >
                                  {project.current_user_role || 'Member'}
                                </Text>
                              }
                            />
                            <Space size={6}>
                              <CalendarOutlined
                                style={{
                                  fontSize: '11px',
                                  color: isDark
                                    ? colors.textTertiaryDark
                                    : colors.textTertiary,
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: '12px',
                                  color: isDark
                                    ? colors.textTertiaryDark
                                    : colors.textTertiary,
                                }}
                              >
                                {new Date(project.updated_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                            </Space>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </div>

              {/* Card Footer */}
              {!projectsLoading && recentProjects.length > 0 && (
                <div
                  style={{
                    padding: '16px 24px',
                    borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: '13px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                    }}
                  >
                    Showing {recentProjects.length} of {workspaceProjects.length} projects
                  </Text>
                  {currentWorkspace?.current_user_permissions?.can_create_projects !== false && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setCreateProjectVisible(true)}
                      style={{ height: '32px', fontWeight: 500 }}
                    >
                      New Project
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </Col>

          {/* Sidebar - 1/3 width */}
          <Col xs={24} lg={8}>
            <Space orientation="vertical" size={20} style={{ width: '100%' }}>
              {/* Quick Actions */}
              <Card
                variant="borderless"
                style={{
                  backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
                styles={{ body: { padding: '20px' } }}
              >
                <Space orientation="vertical" size={4} style={{ marginBottom: '16px' }}>
                  <Text strong style={{ fontSize: '15px', fontWeight: 600 }}>
                    Quick Actions
                  </Text>
                  <Text
                    style={{
                      fontSize: '13px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                    }}
                  >
                    Common tasks and shortcuts
                  </Text>
                </Space>

                <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                  <Button
                    block
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateProjectVisible(true)}
                    disabled={
                      !currentWorkspace ||
                      currentWorkspace.current_user_permissions?.can_create_projects === false
                    }
                    style={{
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      fontWeight: 500,
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    }}
                  >
                    Create New Project
                  </Button>
                  <Button
                    block
                    size="large"
                    icon={<FileTextOutlined />}
                    onClick={() => navigate('/projects')}
                    style={{
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      fontWeight: 500,
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    }}
                  >
                    Browse All Projects
                  </Button>
                  <Button
                    block
                    size="large"
                    icon={<TeamOutlined />}
                    onClick={() => navigate('/workspaces')}
                    style={{
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      fontWeight: 500,
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    }}
                  >
                    Workspace Settings
                  </Button>
                </Space>
              </Card>

              {/* Activity Overview */}
              <Card
                variant="borderless"
                style={{
                  backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
                styles={{ body: { padding: '20px' } }}
              >
                <Space orientation="vertical" size={4} style={{ marginBottom: '20px' }}>
                  <Text strong style={{ fontSize: '15px', fontWeight: 600 }}>
                    Activity Overview
                  </Text>
                  <Text
                    style={{
                      fontSize: '13px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                    }}
                  >
                    Your workspace at a glance
                  </Text>
                </Space>

                <Space orientation="vertical" size={20} style={{ width: '100%' }}>
                  {/* Project Activity */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <Space size={8}>
                        <RocketOutlined
                          style={{
                            fontSize: '14px',
                            color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                          }}
                        >
                          Active This Week
                        </Text>
                      </Space>
                      <Text
                        strong
                        style={{
                          fontSize: '13px',
                          color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                        }}
                      >
                        {activeProjects} / {workspaceProjects.length}
                      </Text>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: isDark
                          ? colors.backgroundTertiaryDark
                          : colors.backgroundTertiary,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: workspaceProjects.length
                            ? `${(activeProjects / workspaceProjects.length) * 100}%`
                            : '0%',
                          backgroundColor: colors.success,
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <Divider style={{ margin: 0 }} />

                  {/* Member Activity */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <Space size={8}>
                        <UserOutlined
                          style={{
                            fontSize: '14px',
                            color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                          }}
                        >
                          Workspace Members
                        </Text>
                      </Space>
                      <Text
                        strong
                        style={{
                          fontSize: '13px',
                          color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                        }}
                      >
                        {currentWorkspace?.member_count || 0}
                      </Text>
                    </div>
                  </div>

                  <Divider style={{ margin: 0 }} />

                  {/* Completion Stats */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <Space size={8}>
                        <TrophyOutlined
                          style={{
                            fontSize: '14px',
                            color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                          }}
                        >
                          Completed Projects
                        </Text>
                      </Space>
                      <Text
                        strong
                        style={{
                          fontSize: '13px',
                          color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                        }}
                      >
                        {completedProjects}
                      </Text>
                    </div>
                  </div>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>

      <CreateProjectModal
        visible={createProjectVisible}
        onClose={() => setCreateProjectVisible(false)}
        onSuccess={handleProjectCreated} // FIXED: Use the handler that passes workspace ID
      />
    </MainLayout>
  );
};

export default Dashboard;