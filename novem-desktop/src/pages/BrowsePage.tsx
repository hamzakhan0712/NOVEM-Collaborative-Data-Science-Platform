import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Card,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Avatar,
  Button,
  Empty,
  Tooltip,
  Badge,
  Divider,
  message,
} from 'antd';
import {
  SearchOutlined,
  FolderOutlined,
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  StarOutlined,
  GlobalOutlined,
  LockOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { backendAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import RequestJoinModal from '../components/projects/RequestJoinModal';
import WorkspaceRequestJoinModal from '../components/workspaces/WorkspaceRequestJoinModal';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface BrowseProject {
  id: number;
  name: string;
  slug: string;
  description: string;
  workspace: number | null;
  workspace_name?: string;
  creator: any;
  visibility: 'private' | 'team' | 'public';
  tags: string[];
  member_count: number;
  dataset_count: number;
  created_at: string;
  updated_at: string;
}

interface BrowseWorkspace {
  id: number;
  name: string;
  slug: string;
  description: string;
  workspace_type: string;
  visibility: string;
  owner: any;
  member_count: number;
  project_count: number;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

interface Recommendation {
  project_id?: number;
  workspace_id?: number;
  score: number;
  reasons: string[];
}

const BrowsePage: React.FC = () => {
  const { offlineMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'projects' | 'workspaces'>('projects');
  
  // Projects state
  const [projects, setProjects] = useState<BrowseProject[]>([]);
  const [projectRecommendations, setProjectRecommendations] = useState<Recommendation[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Workspaces state
  const [workspaces, setWorkspaces] = useState<BrowseWorkspace[]>([]);
  const [workspaceRecommendations, setWorkspaceRecommendations] = useState<Recommendation[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Join request modals
  const [projectJoinModalVisible, setProjectJoinModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<BrowseProject | null>(null);
  
  const [workspaceJoinModalVisible, setWorkspaceJoinModalVisible] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<BrowseWorkspace | null>(null);

  useEffect(() => {
    if (activeTab === 'projects') {
      loadProjects();
    } else {
      loadWorkspaces();
    }
  }, [activeTab, searchTerm, visibilityFilter, typeFilter]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (visibilityFilter !== 'all') params.visibility = visibilityFilter;
      
      const data = await backendAPI.browseProjects(params);
      setProjects(data.projects || []);
      setProjectRecommendations(data.recommendations || []);
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      if (!error.offline) {
        message.error('Failed to load projects');
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      const data = await backendAPI.browseWorkspaces(params);
      setWorkspaces(data.workspaces || []);
      setWorkspaceRecommendations(data.recommendations || []);
    } catch (error: any) {
      console.error('Failed to load workspaces:', error);
      if (!error.offline) {
        message.error('Failed to load workspaces');
      }
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const handleRequestJoinProject = (project: BrowseProject) => {
    setSelectedProject(project);
    setProjectJoinModalVisible(true);
  };

  const handleRequestJoinWorkspace = (workspace: BrowseWorkspace) => {
    setSelectedWorkspace(workspace);
    setWorkspaceJoinModalVisible(true);
  };

  const getRecommendationBadge = (id: number, type: 'project' | 'workspace') => {
    const recommendations = type === 'project' ? projectRecommendations : workspaceRecommendations;
    const rec = recommendations.find(r => 
      type === 'project' ? r.project_id === id : r.workspace_id === id
    );
    
    if (!rec || rec.score < 5) return null;
    
    return (
      <Tooltip title={rec.reasons.join(' • ')}>
        <Badge
          count={
            <Tag icon={<FireOutlined />} color="orange">
              Recommended
            </Tag>
          }
          style={{ marginLeft: '8px' }}
        />
      </Tooltip>
    );
  };

  const getActivityLevel = (updatedAt: string) => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate < 7) return { text: 'Very Active', color: 'success' };
    if (daysSinceUpdate < 30) return { text: 'Active', color: 'processing' };
    if (daysSinceUpdate < 90) return { text: 'Moderate', color: 'warning' };
    return { text: 'Inactive', color: 'default' };
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <GlobalOutlined style={{ color: '#52c41a' }} />;
      case 'team':
        return <TeamOutlined style={{ color: '#1890ff' }} />;
      case 'private':
        return <LockOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const renderProjectCard = (project: BrowseProject) => {
    const activity = getActivityLevel(project.updated_at);
    const recommendation = getRecommendationBadge(project.id, 'project');
    
    return (
      <Card
        key={project.id}
        hoverable
        style={{ marginBottom: '12px' }}
        bodyStyle={{ padding: '20px' }}
      >
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space align="center" wrap>
                <FolderOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                <Title level={4} style={{ margin: 0 }}>
                  {project.name}
                </Title>
                {recommendation}
                <Tag color={activity.color}>{activity.text}</Tag>
                <Tooltip title={project.visibility}>
                  {getVisibilityIcon(project.visibility)}
                </Tooltip>
              </Space>

              <Paragraph
                ellipsis={{ rows: 2 }}
                type="secondary"
                style={{ margin: '8px 0', minHeight: '44px' }}
              >
                {project.description || 'No description provided'}
              </Paragraph>

              <Space wrap size={[8, 8]}>
                {project.workspace_name && (
                  <Tag icon={<TeamOutlined />}>{project.workspace_name}</Tag>
                )}
                {project.tags?.slice(0, 3).map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
                {project.tags?.length > 3 && (
                  <Tag>+{project.tags.length - 3} more</Tag>
                )}
              </Space>

              <Space size="large" style={{ marginTop: '8px' }}>
                <Space size="small">
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    src={project.creator.profile_picture}
                  />
                  <Text type="secondary">
                    {project.creator.first_name} {project.creator.last_name}
                  </Text>
                </Space>
                <Space size="small">
                  <TeamOutlined />
                  <Text type="secondary">{project.member_count} members</Text>
                </Space>
                <Space size="small">
                  <DatabaseOutlined />
                  <Text type="secondary">{project.dataset_count} datasets</Text>
                </Space>
                <Space size="small">
                  <ClockCircleOutlined />
                  <Text type="secondary">
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </Text>
                </Space>
              </Space>
            </Space>
          </Col>

          <Col>
            <Button
              type="primary"
              onClick={() => handleRequestJoinProject(project)}
              disabled={offlineMode}
            >
              Request to Join
            </Button>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderWorkspaceCard = (workspace: BrowseWorkspace) => {
    const activity = getActivityLevel(workspace.updated_at);
    const recommendation = getRecommendationBadge(workspace.id, 'workspace');
    
    return (
      <Card
        key={workspace.id}
        hoverable
        style={{ marginBottom: '12px' }}
        bodyStyle={{ padding: '20px' }}
      >
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space align="center" wrap>
                {workspace.avatar ? (
                  <Avatar size={40} src={workspace.avatar} />
                ) : (
                  <Avatar size={40} icon={<TeamOutlined />} />
                )}
                <Title level={4} style={{ margin: 0 }}>
                  {workspace.name}
                </Title>
                {recommendation}
                <Tag color={activity.color}>{activity.text}</Tag>
                <Tag color="blue">{workspace.workspace_type}</Tag>
                <Tooltip title={workspace.visibility}>
                  {getVisibilityIcon(workspace.visibility)}
                </Tooltip>
              </Space>

              <Paragraph
                ellipsis={{ rows: 2 }}
                type="secondary"
                style={{ margin: '8px 0', minHeight: '44px' }}
              >
                {workspace.description || 'No description provided'}
              </Paragraph>

              <Space size="large" style={{ marginTop: '8px' }}>
                <Space size="small">
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    src={workspace.owner.profile_picture}
                  />
                  <Text type="secondary">
                    {workspace.owner.first_name} {workspace.owner.last_name}
                  </Text>
                </Space>
                <Space size="small">
                  <TeamOutlined />
                  <Text type="secondary">{workspace.member_count} members</Text>
                </Space>
                <Space size="small">
                  <FolderOutlined />
                  <Text type="secondary">{workspace.project_count} projects</Text>
                </Space>
                <Space size="small">
                  <ClockCircleOutlined />
                  <Text type="secondary">
                    Created {new Date(workspace.created_at).toLocaleDateString()}
                  </Text>
                </Space>
              </Space>
            </Space>
          </Col>

          <Col>
            <Button
              type="primary"
              onClick={() => handleRequestJoinWorkspace(workspace)}
              disabled={offlineMode}
            >
              Request to Join
            </Button>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderFilters = () => (
    <Card style={{ marginBottom: '24px' }}>
      <Space style={{ width: '100%', flexDirection:'row', justifyContent:'space-between' }}>
        <Search
          placeholder={`Search ${activeTab}...`}
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={activeTab === 'projects' ? loadProjects : loadWorkspaces}
          style={{ width: '100%', flex:1 }}
        />

        <Space wrap>
          {activeTab === 'projects' ? (
            <Select
              style={{ width: 200 }}
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              options={[
                { label: 'All Visibility', value: 'all' },
                { label: 'Public Only', value: 'public' },
                { label: 'Team Only', value: 'team' },
              ]}
            />
          ) : (
            <Select
              style={{ width: 200 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: 'All Types', value: 'all' },
                { label: 'Personal', value: 'personal' },
                { label: 'Team', value: 'team' },
                { label: 'Organization', value: 'organization' },
                { label: 'Client', value: 'client' },
              ]}
            />
          )}
        </Space>
      </Space>
    </Card>
  );

  const tabItems = [
    {
      key: 'projects',
      label: (
        <Space>
          <FolderOutlined />
          <span>Projects</span>
          <Badge count={projects.length} showZero style={{ backgroundColor: '#52c41a' }} />
        </Space>
      ),
      children: (
        <div>
          {renderFilters()}
          
          {loadingProjects ? (
            <Card loading />
          ) : projects.length === 0 ? (
            <Card>
              <Empty
                description={
                  searchTerm
                    ? `No projects found matching "${searchTerm}"`
                    : 'No discoverable projects available'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          ) : (
            <>
              {projectRecommendations.length > 0 && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <Space>
                      <StarOutlined style={{ color: '#faad14' }} />
                      <Text strong>Recommended for You</Text>
                    </Space>
                  </div>
                  {projects
                    .filter(p => projectRecommendations.some(r => r.project_id === p.id))
                    .slice(0, 3)
                    .map(renderProjectCard)}
                  <Divider />
                </>
              )}

              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary">All Projects</Text>
              </div>
              {projects
                .filter(p => !projectRecommendations.some(r => r.project_id === p.id))
                .map(renderProjectCard)}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'workspaces',
      label: (
        <Space>
          <TeamOutlined />
          <span>Workspaces</span>
          <Badge count={workspaces.length} showZero style={{ backgroundColor: '#1890ff' }} />
        </Space>
      ),
      children: (
        <div>
          {renderFilters()}
          
          {loadingWorkspaces ? (
            <Card loading />
          ) : workspaces.length === 0 ? (
            <Card>
              <Empty
                description={
                  searchTerm
                    ? `No workspaces found matching "${searchTerm}"`
                    : 'No discoverable workspaces available'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          ) : (
            <>
              {workspaceRecommendations.length > 0 && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <Space>
                      <StarOutlined style={{ color: '#faad14' }} />
                      <Text strong>Recommended for You</Text>
                    </Space>
                  </div>
                  {workspaces
                    .filter(w => workspaceRecommendations.some(r => r.workspace_id === w.id))
                    .slice(0, 3)
                    .map(renderWorkspaceCard)}
                  <Divider />
                </>
              )}

              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary">All Workspaces</Text>
              </div>
              {workspaces
                .filter(w => !workspaceRecommendations.some(r => r.workspace_id === w.id))
                .map(renderWorkspaceCard)}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            Discover Projects & Workspaces
          </Title>
          <Text type="secondary">
            Find and join projects and workspaces to collaborate with others
          </Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'projects' | 'workspaces')}
          items={tabItems}
          size="large"
        />

        {/* Project Join Request Modal */}
        {selectedProject && (
          <RequestJoinModal
            visible={projectJoinModalVisible}
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            onClose={() => {
              setProjectJoinModalVisible(false);
              setSelectedProject(null);
            }}
            onSuccess={() => {
              message.success('Join request sent successfully!');
              loadProjects();
            }}
          />
        )}

        {/* Workspace Join Request Modal */}
        {selectedWorkspace && (
          <WorkspaceRequestJoinModal
            visible={workspaceJoinModalVisible}
            workspaceId={selectedWorkspace.id}
            workspaceName={selectedWorkspace.name}
            onClose={() => {
              setWorkspaceJoinModalVisible(false);
              setSelectedWorkspace(null);
            }}
            onSuccess={() => {
              message.success('Workspace join request sent successfully!');
              loadWorkspaces();
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default BrowsePage;