import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Divider,
  Empty,
  Statistic,
} from 'antd';
import {
  TeamOutlined,
  FolderOutlined,
  UserOutlined,
  GlobalOutlined,
  LockOutlined,
  EyeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Title, Text, Paragraph } = Typography;

interface WorkspaceOverviewTabProps {
  workspace: any;
  projects: any[];
}

const WorkspaceOverviewTab: React.FC<WorkspaceOverviewTabProps> = ({ workspace, projects }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!workspace) return null;

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <GlobalOutlined />;
      case 'internal':
        return <EyeOutlined />;
      default:
        return <LockOutlined />;
    }
  };

  const recentProjects = projects.slice(0, 5);
  const activeProjects = projects.filter((p) => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate <= 7;
  });

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Left Column - Main Info */}
        <Col xs={24} lg={16}>
          {/* About Section */}
          <Card
            variant="borderless"
            style={{
              marginBottom: '16px',
              backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <Title
              level={5}
              style={{
                marginBottom: '16px',
                fontSize: '15px',
                fontWeight: 600,
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              About
            </Title>
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              <Paragraph
                style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                }}
              >
                {workspace.description || 'No description provided'}
              </Paragraph>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <Space orientation="vertical" size={4}>
                    <Text
                      style={{
                        fontSize: '12px',
                        color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 500,
                      }}
                    >
                      Type
                    </Text>
                    <Tag
                      style={{
                        fontSize: '13px',
                        padding: '4px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: isDark
                          ? colors.backgroundTertiaryDark
                          : colors.backgroundTertiary,
                        textTransform: 'capitalize',
                        marginRight: 0,
                      }}
                    >
                      {workspace.workspace_type}
                    </Tag>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space orientation="vertical" size={4}>
                    <Text
                      style={{
                        fontSize: '12px',
                        color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 500,
                      }}
                    >
                      Visibility
                    </Text>
                    <Tag
                      icon={getVisibilityIcon(workspace.visibility)}
                      style={{
                        fontSize: '13px',
                        padding: '4px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: isDark
                          ? colors.backgroundTertiaryDark
                          : colors.backgroundTertiary,
                        textTransform: 'capitalize',
                        marginRight: 0,
                      }}
                    >
                      {workspace.visibility}
                    </Tag>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space orientation="vertical" size={4}>
                    <Text
                      style={{
                        fontSize: '12px',
                        color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 500,
                      }}
                    >
                      Created
                    </Text>
                    <Text
                      style={{
                        fontSize: '13px',
                        color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                      }}
                    >
                      {new Date(workspace.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space orientation="vertical" size={4}>
                    <Text
                      style={{
                        fontSize: '12px',
                        color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 500,
                      }}
                    >
                      Owner
                    </Text>
                    <Space size={8}>
                      <UserOutlined
                        style={{
                          fontSize: '13px',
                          color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: '13px',
                          color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                        }}
                      >
                        {workspace.owner?.first_name} {workspace.owner?.last_name}
                      </Text>
                    </Space>
                  </Space>
                </Col>
              </Row>
            </Space>
          </Card>

          {/* Recent Projects */}
          <Card
            variant="borderless"
            style={{
              backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <Title
                level={5}
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                }}
              >
                Recent Projects
              </Title>
              <Text
                style={{
                  fontSize: '13px',
                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                }}
              >
                {projects.length} total
              </Text>
            </div>

            {recentProjects.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text
                    style={{
                      fontSize: '13px',
                      color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                    }}
                  >
                    No projects yet
                  </Text>
                }
              />
            ) : (
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: isDark
                        ? colors.backgroundSecondaryDark
                        : colors.backgroundSecondary,
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.logoCyan;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDark
                        ? colors.borderDark
                        : colors.border;
                    }}
                  >
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space size={12}>
                        <FolderOutlined
                          style={{ fontSize: '16px', color: colors.logoCyan }}
                        />
                        <div>
                          <Text
                            strong
                            style={{
                              fontSize: '14px',
                              display: 'block',
                              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                            }}
                          >
                            {project.name}
                          </Text>
                          <Space size={8} style={{ marginTop: '4px' }}>
                            <Space size={4}>
                              <TeamOutlined
                                style={{
                                  fontSize: '12px',
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
                                {project.member_count || 0}
                              </Text>
                            </Space>
                            <Text
                              style={{
                                fontSize: '12px',
                                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                              }}
                            >
                              •
                            </Text>
                            <Text
                              style={{
                                fontSize: '12px',
                                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                              }}
                            >
                              Updated {new Date(project.updated_at).toLocaleDateString()}
                            </Text>
                          </Space>
                        </div>
                      </Space>
                      <Tag
                        style={{
                          fontSize: '11px',
                          textTransform: 'capitalize',
                          border: 'none',
                        }}
                      >
                        {project.visibility}
                      </Tag>
                    </Space>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        {/* Right Column - Stats & Activity */}
        <Col xs={24} lg={8}>
          {/* Quick Stats */}
          <Card
            variant="borderless"
            style={{
              marginBottom: '16px',
              backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <Title
              level={5}
              style={{
                marginBottom: '16px',
                fontSize: '15px',
                fontWeight: 600,
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              Quick Stats
            </Title>
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: '12px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        >
                          Total Projects
                        </Text>
                      }
                      value={workspace.project_count || 0}
                      valueStyle={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                      }}
                      prefix={
                        <FolderOutlined
                          style={{
                            fontSize: '18px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        />
                      }
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: '12px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        >
                          Active
                        </Text>
                      }
                      value={activeProjects.length}
                      valueStyle={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: colors.success,
                      }}
                      prefix={
                        <CheckCircleOutlined
                          style={{
                            fontSize: '18px',
                            color: colors.success,
                          }}
                        />
                      }
                    />
                  </Col>
                </Row>
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: '12px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        >
                          Members
                        </Text>
                      }
                      value={workspace.member_count || 0}
                      valueStyle={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                      }}
                      prefix={
                        <TeamOutlined
                          style={{
                            fontSize: '18px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        />
                      }
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: '12px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        >
                          Datasets
                        </Text>
                      }
                      value={projects.reduce((sum, p) => sum + (p.dataset_count || 0), 0)}
                      valueStyle={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                      }}
                    />
                  </Col>
                </Row>
              </div>
            </Space>
          </Card>

          {/* Activity Timeline */}
          <Card
            variant="borderless"
            style={{
              backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <Title
              level={5}
              style={{
                marginBottom: '16px',
                fontSize: '15px',
                fontWeight: 600,
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              Recent Activity
            </Title>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text
                  style={{
                    fontSize: '13px',
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Activity feed coming soon
                </Text>
              }
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkspaceOverviewTab;