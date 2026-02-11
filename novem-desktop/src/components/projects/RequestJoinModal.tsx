import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Typography, Space } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { backendAPI } from '../../services/api';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface RequestJoinModalProps {
  visible: boolean;
  projectId: number;
  projectName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const RequestJoinModal: React.FC<RequestJoinModalProps> = ({
  visible,
  projectId,
  projectName,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await backendAPI.requestJoinProject(projectId, values.message);

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

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined />
          <span>Request to Join Project</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={<UserAddOutlined />}
        >
          Send Request
        </Button>,
      ]}
      width={600}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Paragraph>
            You are requesting to join <Text strong>"{projectName}"</Text>
          </Paragraph>
          <Paragraph type="secondary">
            The project lead will review your request and decide whether to approve it.
            You can add an optional message to explain why you'd like to join.
          </Paragraph>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            label="Message to Project Lead (Optional)"
            name="message"
            extra="Tell the project lead why you'd like to join this project"
          >
            <TextArea
              rows={4}
              placeholder="I'm interested in contributing to this project because..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};

export default RequestJoinModal;
