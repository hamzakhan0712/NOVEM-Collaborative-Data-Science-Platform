import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  message,
  Dropdown,
  MenuProps,
  Tooltip,
  Tabs,
  Badge,
} from 'antd';
import {
  UserOutlined,
  UserAddOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  MoreOutlined,
  CrownOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { backendAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Text } = Typography;

interface ProjectTeamTabProps {
  project: any;
  onUpdate: () => void;
}

const ProjectTeamTab: React.FC<ProjectTeamTabProps> = ({ project, onUpdate }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [inviteForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [approveForm] = Form.useForm();
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const canInvite = project.current_user_permissions?.can_invite_members;

  // Replace the existing useEffect

  useEffect(() => {
    if (project) {
      loadMembers();
      if (canInvite) {
        loadJoinRequests();
        loadInvitations();
      }
    }
  }, [project, canInvite]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await backendAPI.getProjectMembers(project.id);
      setMembers(data);
    } catch (error) {
      message.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    setRequestsLoading(true);
    try {
      const data = await backendAPI.getProjectJoinRequests(project.id);
      setJoinRequests(data);
    } catch (error) {
      console.error('Failed to load join requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Add after loadJoinRequests function

  const loadInvitations = async () => {
    try {
      const data = await backendAPI.getProjectInvitations(project.id);
      setSentInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const handleInvite = async () => {
    try {
      const values = await inviteForm.validateFields();
      await backendAPI.inviteProjectMember(project.id, values);
      message.success('Invitation sent successfully');
      inviteForm.resetFields();
      setInviteModalVisible(false);
      loadInvitations(); // Reload invitations
      onUpdate();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.error || 'Failed to send invitation');
    }
  };

  const handleUpdateRole = async () => {
    try {
      const values = await editForm.validateFields();
      await backendAPI.updateProjectMemberRole(project.id, {
        user_id: selectedMember.user.id,
        role: values.role,
      });
      message.success('Member role updated');
      setEditModalVisible(false);
      loadMembers();
      onUpdate();
    } catch (error: any) {
      message.error('Failed to update member role');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    Modal.confirm({
      title: 'Remove Team Member',
      content: 'Are you sure you want to remove this member from the project?',
      okText: 'Remove',
      okType: 'danger',
      onOk: async () => {
        try {
          await backendAPI.removeProjectMember(project.id, userId);
          message.success('Member removed from project');
          loadMembers();
          onUpdate();
        } catch (error: any) {
          message.error('Failed to remove member');
        }
      },
    });
  };

  const handleApproveRequest = async () => {
    try {
      const values = await approveForm.validateFields();
      await backendAPI.approveJoinRequest(
        project.id,
        selectedRequest.id,
        values.role
      );
      message.success('Join request approved');
      setApproveModalVisible(false);
      approveForm.resetFields();
      loadJoinRequests();
      loadMembers();
      onUpdate();
    } catch (error: any) {
      message.error('Failed to approve request');
    }
  };

  const handleRejectRequest = (requestId: number) => {
    Modal.confirm({
      title: 'Reject Join Request',
      content: 'Are you sure you want to reject this join request?',
      okText: 'Reject',
      okType: 'danger',
      onOk: async () => {
        try {
          await backendAPI.rejectJoinRequest(project.id, requestId);
          message.success('Join request rejected');
          loadJoinRequests();
        } catch (error) {
          message.error('Failed to reject request');
        }
      },
    });
  };

  const getMemberMenuItems = (member: any): MenuProps['items'] => {
    const isCreator = member.user.id === project.creator.id;

    return [
      {
        key: 'edit',
        label: 'Edit Role',
        icon: <EditOutlined />,
        disabled: isCreator || !canInvite,
        onClick: () => {
          setSelectedMember(member);
          editForm.setFieldsValue({ role: member.role });
          setEditModalVisible(true);
        },
      },
      {
        type: 'divider',
      },
      {
        key: 'remove',
        label: 'Remove Member',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: isCreator || !canInvite,
        onClick: () => handleRemoveMember(member.user.id),
      },
    ];
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead':
        return 'purple';
      case 'contributor':
        return 'blue';
      case 'analyst':
        return 'green';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  const memberColumns = [
    {
      title: 'Member',
      key: 'member',
      render: (_: any, record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.user.profile_picture} />
          <div>
            <Space>
              <Text strong>
                {record.user.first_name} {record.user.last_name}
              </Text>
              {record.user.id === project.creator.id && (
                <CrownOutlined style={{ color: '#faad14' }} />
              )}
            </Space>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>{role.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: any, record: any) => (
        <Space wrap size={[0, 4]}>
          {record.can_view_data && <Tag>View Data</Tag>}
          {record.can_run_analysis && <Tag>Run Analysis</Tag>}
          {record.can_publish_results && <Tag>Publish</Tag>}
          {record.can_manage_connectors && <Tag>Manage Connectors</Tag>}
          {record.can_invite_members && <Tag>Invite</Tag>}
        </Space>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'joined_at',
      key: 'joined_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Dropdown menu={{ items: getMemberMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const requestColumns = [
    {
      title: 'Requester',
      key: 'requester',
      render: (_: any, record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>
              {record.user.first_name} {record.user.last_name}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user.email}
            </Text>
          </div>
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
      render: (status: string) => {
        const colors: any = {
          pending: 'orange',
          approved: 'green',
          rejected: 'red',
        };
        return (
          <Tag color={colors[status]} icon={<ClockCircleOutlined />}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Requested',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Reject">
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleRejectRequest(record.id)}
            />
          </Tooltip>
          <Tooltip title="Approve">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => {
                setSelectedRequest(record);
                approveForm.setFieldsValue({ role: 'viewer' });
                setApproveModalVisible(true);
              }}
            >
              Approve
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const pendingRequests = joinRequests.filter((r) => r.status === 'pending');

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Text type="secondary">
          Manage team members and review join requests
        </Text>
        <Tooltip title={!canInvite ? 'You do not have permission to invite members' : ''}>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setInviteModalVisible(true)}
            disabled={!canInvite}
          >
            Invite Member
          </Button>
        </Tooltip>
      </div>

      <Card
        variant="borderless"
        style={{
          backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Tabs
          items={[
            {
              key: 'members',
              label: `Members (${members.length})`,
              children: (
                <Table
                  columns={memberColumns}
                  dataSource={members}
                  loading={loading}
                  rowKey={(record) => record.user.id}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            ...(canInvite
              ? [
                  {
                    key: 'invitations',
                    label: (
                      <Badge count={sentInvitations.filter(inv => inv.status === 'pending').length} offset={[10, 0]}>
                        <span>Sent Invitations</span>
                      </Badge>
                    ),
                    children: (
                      <Table
                        columns={[
                          {
                            title: 'Invitee',
                            key: 'invitee',
                            render: (_: any, record: any) => (
                              <div>
                                <Text strong>{record.invitee_email}</Text>
                                {record.invitee && (
                                  <>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                      {record.invitee.first_name} {record.invitee.last_name}
                                    </Text>
                                  </>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: 'Role',
                            dataIndex: 'role',
                            key: 'role',
                            render: (role: string) => (
                              <Tag color={getRoleColor(role)}>{role.toUpperCase()}</Tag>
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
                            render: (_: any, record: any) => {
                              const colors: any = {
                                pending: 'blue',
                                accepted: 'green',
                                declined: 'red',
                                expired: 'default',
                              };
                              const status = record.is_expired ? 'expired' : record.status;
                              return (
                                <Tag color={colors[status]}>
                                  {status.toUpperCase()}
                                </Tag>
                              );
                            },
                          },
                          {
                            title: 'Sent',
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
                        ]}
                        dataSource={sentInvitations}
                        loading={requestsLoading}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                      />
                    ),
                  },
                  {
                    key: 'requests',
                    label: (
                      <Badge count={pendingRequests.length} offset={[10, 0]}>
                        <span>Join Requests</span>
                      </Badge>
                    ),
                    children: (
                      <Table
                        columns={requestColumns}
                        dataSource={joinRequests}
                        loading={requestsLoading}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {/* Invite Member Modal */}
      <Modal
        title="Invite Team Member"
        open={inviteModalVisible}
        onCancel={() => {
          setInviteModalVisible(false);
          inviteForm.resetFields();
        }}
        onOk={handleInvite}
        okText="Send Invitation"
      >
        <Form form={inviteForm} layout="vertical">
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter an email address' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="colleague@example.com" />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select a role' }]}
            initialValue="analyst"
          >
            <Select>
              <Select.Option value="viewer">
                <Space orientation="vertical" size={0}>
                  <Text strong>Viewer</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Can view data only
                  </Text>
                </Space>
              </Select.Option>
              <Select.Option value="analyst">
                <Space orientation="vertical" size={0}>
                  <Text strong>Analyst</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Can view data and run analyses
                  </Text>
                </Space>
              </Select.Option>
              <Select.Option value="contributor">
                <Space orientation="vertical" size={0}>
                  <Text strong>Contributor</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Can publish results and manage connectors
                  </Text>
                </Space>
              </Select.Option>
              <Select.Option value="lead">
                <Space orientation="vertical" size={0}>
                  <Text strong>Lead</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Full permissions including inviting members
                  </Text>
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Message (Optional)" name="message">
            <Input.TextArea
              rows={3}
              placeholder="Add a personal message to the invitation..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Member Role Modal */}
      <Modal
        title="Edit Member Role"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleUpdateRole}
        okText="Update Role"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="viewer">Viewer</Select.Option>
              <Select.Option value="analyst">Analyst</Select.Option>
              <Select.Option value="contributor">Contributor</Select.Option>
              <Select.Option value="lead">Lead</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Approve Join Request Modal */}
      <Modal
        title="Approve Join Request"
        open={approveModalVisible}
        onCancel={() => {
          setApproveModalVisible(false);
          approveForm.resetFields();
        }}
        onOk={handleApproveRequest}
        okText="Approve & Add to Project"
      >
        {selectedRequest && (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text strong>
                {selectedRequest.user.first_name} {selectedRequest.user.last_name}
              </Text>
              <br />
              <Text type="secondary">{selectedRequest.user.email}</Text>
            </div>

            {selectedRequest.message && (
              <div>
                <Text type="secondary">Message:</Text>
                <br />
                <Text italic>"{selectedRequest.message}"</Text>
              </div>
            )}

            <Form form={approveForm} layout="vertical">
              <Form.Item
                label="Assign Role"
                name="role"
                rules={[{ required: true }]}
                initialValue="viewer"
              >
                <Select>
                  <Select.Option value="viewer">Viewer</Select.Option>
                  <Select.Option value="analyst">Analyst</Select.Option>
                  <Select.Option value="contributor">Contributor</Select.Option>
                  <Select.Option value="lead">Lead</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default ProjectTeamTab;