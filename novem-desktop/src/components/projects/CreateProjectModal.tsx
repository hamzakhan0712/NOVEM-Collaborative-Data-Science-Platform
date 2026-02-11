import React, { useState } from 'react';
import { Modal, Form, Input, Select, Radio, Space, Typography, message } from 'antd';
import {
  FolderOutlined,
  LockOutlined,
  TeamOutlined,
  GlobalOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useProject } from '../../contexts/ProjectContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { workspaces, currentWorkspace } = useWorkspace();
  const { createProject } = useProject(); // FIXED: Use createProject from context
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      console.log('📝 [CreateProjectModal] Form values:', values);
      console.log('🏢 [CreateProjectModal] Selected workspace ID:', values.workspace);
      console.log('🏢 [CreateProjectModal] Current workspace:', currentWorkspace?.name);

      // FIXED: Use createProject from ProjectContext which handles workspace_id correctly
      await createProject({
        name: values.name,
        description: values.description,
        workspace_id: values.workspace, // Backend expects workspace_id
        visibility: values.visibility,
        tags: values.tags || [],
      });

      console.log(' [CreateProjectModal] Project created successfully');
      message.success('Project created successfully');
      
      form.resetFields();
      onClose();
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        console.log('🔄 [CreateProjectModal] Calling onSuccess callback');
        onSuccess();
      }
    } catch (error: any) {
      console.error(' [CreateProjectModal] Submit error:', error);
      if (error.errorFields) {
        // Validation error - Ant Design will show the error
        return;
      }
      // API error is already handled in ProjectContext with message.error
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <Space size={8}>
          <FolderOutlined style={{ fontSize: '16px', color: colors.logoCyan }} />
          <Text strong style={{ fontSize: '16px' }}>
            Create New Project
          </Text>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="Create Project"
      confirmLoading={loading}
      width={560}
      destroyOnHidden
      styles={{
        body: { paddingTop: '24px' },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          workspace: currentWorkspace?.id,
          visibility: 'private',
        }}
      >
        {/* Project Name */}
        <Form.Item
          name="name"
          label={
            <Text strong style={{ fontSize: '13px' }}>
              Project Name
            </Text>
          }
          rules={[
            { required: true, message: 'Please enter a project name' },
            { min: 3, message: 'Name must be at least 3 characters' },
          ]}
        >
          <Input
            size="large"
            placeholder="e.g., Customer Analytics Dashboard"
            prefix={
              <FolderOutlined
                style={{
                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                  fontSize: '14px',
                }}
              />
            }
            style={{ fontSize: '14px' }}
          />
        </Form.Item>

        {/* Workspace Selection */}
        <Form.Item
          name="workspace"
          label={
            <Text strong style={{ fontSize: '13px' }}>
              Workspace
            </Text>
          }
          rules={[{ required: true, message: 'Please select a workspace' }]}
        >
          <Select
            size="large"
            placeholder="Select workspace"
            style={{ fontSize: '14px' }}
            onChange={(value) => {
              console.log('🏢 [CreateProjectModal] Workspace selected:', value);
            }}
          >
            {workspaces.map((workspace) => (
              <Option
                key={workspace.id}
                value={workspace.id}
                disabled={!workspace.current_user_permissions?.can_create_projects}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: isDark
                        ? 'rgba(0, 200, 83, 0.1)'
                        : 'rgba(0, 200, 83, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <TeamOutlined style={{ fontSize: '12px', color: colors.logoCyan }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>
                      {workspace.name}
                    </div>
                    {!workspace.current_user_permissions?.can_create_projects && (
                      <Text
                        type="secondary"
                        style={{
                          fontSize: '12px',
                          color: colors.error,
                        }}
                      >
                        No permission to create projects
                      </Text>
                    )}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Description */}
        <Form.Item
          name="description"
          label={
            <Text strong style={{ fontSize: '13px' }}>
              Description
            </Text>
          }
          rules={[{ required: true, message: 'Please enter a description' }]}
        >
          <TextArea
            rows={3}
            placeholder="Describe the purpose and goals of this project..."
            maxLength={1000}
            showCount
            style={{ resize: 'none', fontSize: '14px' }}
          />
        </Form.Item>

        {/* Visibility */}
        <Form.Item
          name="visibility"
          label={
            <Text strong style={{ fontSize: '13px' }}>
              Visibility
            </Text>
          }
          rules={[{ required: true, message: 'Please select visibility' }]}
        >
          <Radio.Group size="large" style={{ width: '100%' }}>
            <Space orientation="vertical" style={{ width: '100%', gap: '10px' }}>
              {/* Private */}
              <Radio
                value="private"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                  backgroundColor: isDark
                    ? colors.backgroundSecondaryDark
                    : colors.backgroundSecondary,
                  margin: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark
                    ? colors.textSecondaryDark
                    : colors.textSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark
                    ? colors.borderDark
                    : colors.border;
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <LockOutlined
                    style={{
                      fontSize: '16px',
                      color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                      marginTop: '2px',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: '14px',
                        marginBottom: '2px',
                        color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                      }}
                    >
                      Private
                    </div>
                    <Text
                      style={{
                        fontSize: '13px',
                        color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        lineHeight: '1.4',
                      }}
                    >
                      Only invited members can access
                    </Text>
                  </div>
                </div>
              </Radio>

              {/* Team */}
              <Radio
                value="team"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                  backgroundColor: isDark
                    ? colors.backgroundSecondaryDark
                    : colors.backgroundSecondary,
                  margin: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.warning;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark
                    ? colors.borderDark
                    : colors.border;
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <TeamOutlined
                    style={{
                      fontSize: '16px',
                      color: colors.warning,
                      marginTop: '2px',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: '14px',
                        marginBottom: '2px',
                        color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                      }}
                    >
                      Team
                    </div>
                    <Text
                      style={{
                        fontSize: '13px',
                        color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        lineHeight: '1.4',
                      }}
                    >
                      Visible to all workspace members
                    </Text>
                  </div>
                </div>
              </Radio>

              {/* Public */}
              <Radio
                value="public"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                  backgroundColor: isDark
                    ? colors.backgroundSecondaryDark
                    : colors.backgroundSecondary,
                  margin: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.success;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark
                    ? colors.borderDark
                    : colors.border;
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <GlobalOutlined
                    style={{
                      fontSize: '16px',
                      color: colors.success,
                      marginTop: '2px',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: '14px',
                        marginBottom: '2px',
                        color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                      }}
                    >
                      Public
                    </div>
                    <Text
                      style={{
                        fontSize: '13px',
                        color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                        lineHeight: '1.4',
                      }}
                    >
                      Anyone can discover and view
                    </Text>
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* Tags */}
        <Form.Item
          name="tags"
          label={
            <Text strong style={{ fontSize: '13px' }}>
              Tags (Optional)
            </Text>
          }
        >
          <Select
            mode="tags"
            size="large"
            placeholder="machine-learning, analytics, research..."
            maxTagCount={5}
            tokenSeparators={[',']}
            style={{ fontSize: '14px' }}
            suffixIcon={
              <TagsOutlined
                style={{
                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                }}
              />
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;