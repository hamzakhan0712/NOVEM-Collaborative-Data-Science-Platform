import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Modal,
  message,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { backendAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ProjectSettingsTabProps {
  project: any;
}

const ProjectSettingsTab: React.FC<ProjectSettingsTabProps> = ({ project }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>(project.tags || []);
  const [inputTag, setInputTag] = useState('');
  const navigate = useNavigate();

  const canEdit = project.current_user_role === 'lead';

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await backendAPI.updateProject(project.id, {
        ...values,
        tags,
      });

      message.success('Project settings updated');
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('Failed to update project settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Project',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            Are you sure you want to delete this project? This action cannot be undone.
          </Paragraph>
          <Paragraph type="danger" strong>
            All datasets, analyses, and models will be permanently deleted.
          </Paragraph>
        </div>
      ),
      okText: 'Delete Project',
      okType: 'danger',
      onOk: async () => {
        try {
          await backendAPI.deleteProject(project.id);
          message.success('Project deleted');
          navigate('/projects');
        } catch (error) {
          message.error('Failed to delete project');
        }
      },
    });
  };

  const handleAddTag = () => {
    if (inputTag && !tags.includes(inputTag)) {
      setTags([...tags, inputTag]);
      setInputTag('');
    }
  };

  const handleRemoveTag = (removedTag: string) => {
    setTags(tags.filter(tag => tag !== removedTag));
  };

  return (
    <div>
      <Card title="General Settings">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: project.name,
            description: project.description,
            visibility: project.visibility,
          }}
          disabled={!canEdit}
        >
          <Form.Item
            label="Project Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter a project name' },
              { min: 3, message: 'Name must be at least 3 characters' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            label="Visibility"
            name="visibility"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="private">Private</Select.Option>
              <Select.Option value="team">Team</Select.Option>
              <Select.Option value="public">Public</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Tags">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Add a tag..."
                  value={inputTag}
                  onChange={(e) => setInputTag(e.target.value)}
                  onPressEnter={handleAddTag}
                />
                <Button onClick={handleAddTag}>Add</Button>
              </Space.Compact>

              <Space wrap>
                {tags.map(tag => (
                  <Tag
                    key={tag}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                  >
                    {tag}
                  </Tag>
                ))}
              </Space>
            </Space>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              disabled={!canEdit}
            >
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="Danger Zone"
        style={{ marginTop: '16px', borderColor: '#ff4d4f' }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>Delete Project</Title>
            <Paragraph type="secondary">
              Once you delete a project, there is no going back. All data will be permanently deleted.
            </Paragraph>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              disabled={project.current_user_role !== 'lead'}
            >
              Delete This Project
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ProjectSettingsTab;