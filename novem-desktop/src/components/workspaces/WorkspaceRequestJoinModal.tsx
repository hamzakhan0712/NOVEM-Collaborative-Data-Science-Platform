import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Typography, Space } from 'antd';
import { UserAddOutlined, TeamOutlined } from '@ant-design/icons';
import { backendAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface WorkspaceRequestJoinModalProps {
  visible: boolean;
  workspaceId: number;
  workspaceName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const WorkspaceRequestJoinModal: React.FC<WorkspaceRequestJoinModalProps> = ({
  visible,
  workspaceId,
  workspaceName,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await backendAPI.requestJoinWorkspace(workspaceId, values.message);

      message.success('Join request sent successfully');
      form.resetFields();
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.error || 'Failed to send join request');
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
          <TeamOutlined style={{ fontSize: '16px', color: colors.logoCyan }} />
          <Text strong style={{ fontSize: '16px' }}>
            Request to Join Workspace
          </Text>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} size="large">
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={<UserAddOutlined />}
          size="large"
        >
          Send Request
        </Button>,
      ]}
      width={600}
      styles={{
        body: {
          paddingTop: '24px',
        },
      }}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Paragraph
            style={{
              fontSize: '14px',
              marginBottom: '8px',
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            You are requesting to join{' '}
            <Text
              strong
              style={{
                color: colors.logoCyan,
                fontSize: '14px',
              }}
            >
              "{workspaceName}"
            </Text>
          </Paragraph>
          <Paragraph
            style={{
              fontSize: '13px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              marginBottom: 0,
            }}
          >
            The workspace owner or admin will review your request and decide whether to approve it.
            You can add an optional message to explain why you'd like to join.
          </Paragraph>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            label={
              <Text strong style={{ fontSize: '13px' }}>
                Message to Workspace Admin (Optional)
              </Text>
            }
            name="message"
            extra={
              <Text
                type="secondary"
                style={{
                  fontSize: '12px',
                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                }}
              >
                Tell the admin why you'd like to join this workspace
              </Text>
            }
          >
            <TextArea
              rows={4}
              placeholder="I'm interested in joining this workspace because..."
              maxLength={500}
              showCount
              style={{
                fontSize: '14px',
                resize: 'none',
              }}
            />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};

export default WorkspaceRequestJoinModal;