import React from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Empty,
  Tag,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  FolderOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Title, Text, Paragraph } = Typography;

interface WorkspaceProjectsTabProps {
  workspace: any;
  projects: any[];
}

const WorkspaceProjectsTab: React.FC<WorkspaceProjectsTabProps> = ({
  workspace,
  projects,
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getRoleBadgeStatus = (role: string): 'success' | 'processing' | 'default' => {
    switch (role) {
      case 'lead':
        return 'success';
      case 'contributor':
        return 'processing';
      default:
        return 'default';
    }
  };

  return (
    <div>
      {projects.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
          }}
        >
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
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Start by creating your first project
                </Text>
              </Space>
            }
          >
            {workspace.current_user_permissions?.can_create_projects && (
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => navigate('/projects/new')}
                style={{
                  marginTop: '16px',
                  height: '40px',
                  padding: '0 24px',
                  fontSize: '14px',
                }}
              >
                Create Project
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <div>
          {/* Projects Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <Text
              style={{
                fontSize: '13px',
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </Text>
            {workspace.current_user_permissions?.can_create_projects && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/projects/new')}
                style={{
                  height: '36px',
                  fontSize: '14px',
                }}
              >
                New Project
              </Button>
            )}
          </div>

          {/* Projects Grid */}
          <Row gutter={[16, 16]}>
            {projects.map((project) => (
              <Col xs={24} sm={12} lg={8} key={project.id}>
                <Card
                  variant="borderless"
                  style={{
                    backgroundColor: isDark
                      ? colors.backgroundPrimaryDark
                      : colors.backgroundSecondary,
                    border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  bodyStyle={{ padding: '16px' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.logoCyan;
                    e.currentTarget.style.backgroundColor = isDark
                      ? colors.hoverDark
                      : colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark
                      ? colors.borderDark
                      : colors.border;
                    e.currentTarget.style.backgroundColor = isDark
                      ? colors.backgroundSecondaryDark
                      : colors.backgroundSecondary;
                  }}
                >
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
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
                        <FolderOutlined style={{ fontSize: '16px', color: colors.logoCyan }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Title
                          level={5}
                          style={{
                            margin: 0,
                            marginBottom: '4px',
                            fontWeight: 600,
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {project.name}
                        </Title>
                        <Space size={8}>
                          <Badge
                            status={getRoleBadgeStatus(project.current_user_role)}
                            text={
                              <Text
                                style={{
                                  fontSize: '11px',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {project.current_user_role}
                              </Text>
                            }
                          />
                        </Space>
                      </div>
                    </div>

                    {/* Description */}
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        minHeight: '38px',
                        color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                        lineHeight: '1.5',
                      }}
                    >
                      {project.description || 'No description'}
                    </Paragraph>

                    {/* Footer */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '8px',
                        borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                      }}
                    >
                      <Space size={12}>
                        <Space size={4}>
                          <UserOutlined
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
                            {project.member_count || 0}
                          </Text>
                        </Space>
                        <Space size={4}>
                          <FileTextOutlined
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
                            {project.dataset_count || 0}
                          </Text>
                        </Space>
                      </Space>
                      <Tag
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: isDark
                            ? colors.backgroundTertiaryDark
                            : colors.backgroundTertiary,
                          textTransform: 'capitalize',
                        }}
                      >
                        {project.visibility}
                      </Tag>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  );
};

export default WorkspaceProjectsTab;