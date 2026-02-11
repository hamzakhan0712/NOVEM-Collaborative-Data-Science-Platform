import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Input,
  Select,
  Dropdown,
  MenuProps,
  Spin,
  Divider,
  Badge,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  FolderOutlined,
  TeamOutlined,
  DatabaseOutlined,
  MoreOutlined,
  SearchOutlined,
  LoadingOutlined,
  DeleteOutlined,
  SettingOutlined,
  GlobalOutlined,
  LockOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import MainLayout from '../components/layout/MainLayout';
import { colors } from '../theme/config';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, setCurrentProject } = useProject();
  const { offlineMode, user } = useAuth();
  const { theme } = useTheme();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  const isDark = theme === 'dark';

  useEffect(() => {
    console.log('📊 [ProjectsPage] Loading projects...', { offlineMode });
    loadProjects();
  }, [offlineMode]);

  // Ensure projects is always an array before filtering
  const projectsArray = Array.isArray(projects) ? projects : [];
  
  console.log('📊 [ProjectsPage] Projects state:', {
    total: projectsArray.length,
    offlineMode,
    loading
  });
  
  // Filter to show only projects where user is owner or member
  const myProjects = projectsArray.filter(project => {
    const isOwner = project.creator?.id === user?.id;
    const isMember = project.current_user_role !== null && project.current_user_role !== undefined;
    return isOwner || isMember;
  });

  console.log('📊 [ProjectsPage] Filtered projects:', {
    myProjects: myProjects.length,
    userId: user?.id
  });
  
  // Apply search and visibility filters to myProjects
  const filteredProjects = myProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVisibility = visibilityFilter === 'all' || project.visibility === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  const getProjectMenuItems = (project: any): MenuProps['items'] => {
    const isCreator = project.creator?.id === user?.id;

    return [
      {
        key: 'open',
        icon: <FolderOutlined />,
        label: 'Open Project',
        onClick: () => handleOpenProject(project),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Project Settings',
        onClick: () => navigate(`/projects/${project.id}/settings`),
        disabled: (!isCreator && project.current_user_role !== 'lead') || offlineMode,
      },
      ...(isCreator ? [
        {
          type: 'divider' as const,
        },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: 'Delete Project',
          danger: true,
          disabled: offlineMode,
        },
      ] : []),
    ];
  };

  const handleOpenProject = (project: any) => {
    setCurrentProject(project);
    navigate(`/projects/${project.id}`);
  };

  const getVisibilityConfig = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return {
          icon: <GlobalOutlined />,
          color: colors.success,
          label: 'Public',
        };
      case 'team':
        return {
          icon: <EyeOutlined />,
          color: colors.warning,
          label: 'Team',
        };
      default:
        return {
          icon: <LockOutlined />,
          color: isDark ? colors.textSecondaryDark : colors.textSecondary,
          label: 'Private',
        };
    }
  };

  const getRoleBadgeStatus = (project: any): 'success' | 'processing' | 'default' => {
    if (project.current_user_role === 'lead') return 'success';
    if (project.current_user_role === 'contributor') return 'processing';
    return 'default';
  };

  return (
    <MainLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Offline Banner */}
        {offlineMode && (
          <Alert
            message="Offline Mode"
            description="You're viewing cached projects. Some features are limited while offline."
            type="warning"
            icon={<WifiOutlined />}
            showIcon
            closable
            style={{ marginBottom: '24px', borderRadius: '8px' }}
          />
        )}

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: '24px',
                letterSpacing: '-0.01em',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              My Projects
            </Title>
            <Text
              style={{
                fontSize: '14px',
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              {offlineMode 
                ? `Viewing ${myProjects.length} cached projects (offline)`
                : `Projects you own or are a member of`
              }
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            disabled={offlineMode}
            style={{
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {offlineMode ? 'Offline' : 'New Project'}
          </Button>
        </div>

        {/* Filters */}
        <Card
          variant="borderless"
          style={{
            marginBottom: '16px',
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <Search
              placeholder="Search your projects..."
              allowClear
              prefix={<SearchOutlined />}
              style={{ width: 400, maxWidth: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="large"
            />
            <Select
              style={{ width: 200 }}
              placeholder="Filter by visibility"
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              size="large"
              options={[
                { label: 'All Projects', value: 'all' },
                { label: 'Private', value: 'private' },
                { label: 'Team', value: 'team' },
                { label: 'Public', value: 'public' },
              ]}
            />
          </Space>
        </Card>

        {/* Projects Grid */}
        {loading && !offlineMode ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              padding: '60px 24px',
            }}
          >
            <Space orientation="vertical" align="center" size={16}>
              <Spin
                indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
                size="large"
              />
              <Text
                style={{
                  fontSize: '14px',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                }}
              >
                Loading projects...
              </Text>
            </Space>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              padding: '60px 24px',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '420px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <FolderOutlined style={{ fontSize: '28px', color: colors.logoCyan }} />
              </div>

              <Title
                level={3}
                style={{
                  marginBottom: '8px',
                  fontWeight: 600,
                  fontSize: '18px',
                }}
              >
                {searchTerm 
                  ? `No projects found matching "${searchTerm}"` 
                  : offlineMode
                    ? 'No cached projects available'
                    : 'No projects yet'
                }
              </Title>
              <Text
                style={{
                  fontSize: '14px',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  display: 'block',
                  marginBottom: '24px',
                  lineHeight: '1.5',
                }}
              >
                {searchTerm
                  ? 'Try adjusting your search or filters'
                  : offlineMode
                    ? 'Projects will appear here once you sync while online'
                    : 'Create your first project to start analyzing data and collaborating with your team'
                }
              </Text>

              {!searchTerm && !offlineMode && (
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  style={{
                    height: '40px',
                    padding: '0 24px',
                    fontSize: '14px',
                  }}
                >
                  Create Project
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredProjects.map((project) => {
              const visibilityConfig = getVisibilityConfig(project.visibility);

              return (
                <Col xs={24} sm={12} lg={8} key={project.id}>
                  <Card
                    variant="borderless"
                    hoverable
                    style={{
                      backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    bodyStyle={{ padding: 0 }}
                    onClick={() => handleOpenProject(project)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.logoCyan;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDark ? colors.borderDark : colors.border;
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.08)',
                            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FolderOutlined style={{ fontSize: '18px', color: colors.logoCyan }} />
                        </div>

                        {/* Title & Meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <Title
                              level={5}
                              style={{
                                margin: 0,
                                fontWeight: 600,
                                fontSize: '15px',
                                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {project.name}
                            </Title>
                            <Dropdown
                              menu={{ items: getProjectMenuItems(project) }}
                              trigger={['click']}
                              placement="bottomRight"
                            >
                              <Button
                                type="text"
                                icon={<MoreOutlined />}
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                  padding: '4px',
                                  height: 'auto',
                                }}
                              />
                            </Dropdown>
                          </div>

                          <Space size={8} style={{ marginTop: '6px' }}>
                            {project.workspace_name && (
                              <>
                                <Text
                                  style={{
                                    fontSize: '12px',
                                    color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                  }}
                                >
                                  {project.workspace_name}
                                </Text>
                                <Divider orientation="vertical" style={{ margin: 0, height: '12px' }} />
                              </>
                            )}
                            {project.current_user_role && (
                              <Badge
                                status={getRoleBadgeStatus(project)}
                                text={
                                  <Text
                                    style={{
                                      fontSize: '12px',
                                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {project.current_user_role}
                                  </Text>
                                }
                              />
                            )}
                          </Space>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '16px 20px' }}>
                      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                        {/* Description */}
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            minHeight: '40px',
                            color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                            lineHeight: '1.5',
                          }}
                        >
                          {project.description || 'No description provided'}
                        </Paragraph>

                        {/* Tags */}
                        {project.tags && project.tags.length > 0 && (
                          <Space wrap size={[6, 6]}>
                            {project.tags.slice(0, 3).map((tag: string) => (
                              <Tag
                                key={tag}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                }}
                              >
                                {tag}
                              </Tag>
                            ))}
                            {project.tags.length > 3 && (
                              <Tag
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                }}
                              >
                                +{project.tags.length - 3}
                              </Tag>
                            )}
                          </Space>
                        )}

                        {/* Stats Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space size={16}>
                            <Space size={6}>
                              <TeamOutlined
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                  fontWeight: 500,
                                }}
                              >
                                {project.member_count || 0}
                              </Text>
                            </Space>
                            <Space size={6}>
                              <DatabaseOutlined
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                  fontWeight: 500,
                                }}
                              >
                                {project.dataset_count || 0}
                              </Text>
                            </Space>
                          </Space>

                          <Tag
                            icon={visibilityConfig.icon}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                              color: visibilityConfig.color,
                            }}
                          >
                            {visibilityConfig.label}
                          </Tag>
                        </div>

                        {/* Footer Info */}
                        <div style={{ paddingTop: '8px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
                          <Space size={6}>
                            <ClockCircleOutlined
                              style={{
                                fontSize: '12px',
                                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: '12px',
                                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                              }}
                            >
                              Updated {new Date(project.updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </Space>
                        </div>
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSuccess={() => {
            setCreateModalVisible(false);
            loadProjects();
          }}
        />
      </div>
    </MainLayout>
  );
};

export default ProjectsPage;