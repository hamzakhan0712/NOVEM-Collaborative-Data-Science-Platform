import React, { useEffect, useState } from 'react';
import {
  Card,
  Empty,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Modal,
  Upload,
  message,
  Tooltip,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  DatabaseOutlined,
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  FileTextOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text } = Typography;

interface ProjectDatasetsTabProps {
  project: any;
}

const ProjectDatasetsTab: React.FC<ProjectDatasetsTabProps> = ({ project }) => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  useEffect(() => {
    if (project) {
      loadDatasets();
    }
  }, [project]);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual dataset loading
      // const data = await backendAPI.getProjectDatasets(project.id);
      // setDatasets(data);
      setDatasets([]);
    } catch (error) {
      message.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.xlsx,.xls',
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        // TODO: Implement file upload to compute engine
        message.success(`${(file as File).name} uploaded successfully`);
        onSuccess?.(null);
        setUploadModalVisible(false);
        loadDatasets();
      } catch (error) {
        message.error('Upload failed');
        onError?.(error as Error);
      }
    },
    onChange(info) {
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  const getDatasetMenuItems = (_dataset: any): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View Data',
      icon: <EyeOutlined />,
    },
    {
      key: 'download',
      label: 'Download',
      icon: <DownloadOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      disabled: !project.current_user_permissions?.can_manage_connectors,
    },
  ];

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          {record.file_type === 'csv' ? <FileTextOutlined /> : <FileExcelOutlined />}
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: 'Rows',
      dataIndex: 'row_count',
      key: 'row_count',
      render: (count: number) => count?.toLocaleString() || 'N/A',
    },
    {
      title: 'Columns',
      dataIndex: 'column_count',
      key: 'column_count',
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ready' ? 'success' : 'processing'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Dropdown menu={{ items: getDatasetMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const canUpload = project.current_user_permissions?.can_manage_connectors;

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Text type="secondary">
          Manage datasets for this project. Data is stored locally on your machine.
        </Text>
        <Tooltip title={!canUpload ? 'You do not have permission to upload datasets' : ''}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
            disabled={!canUpload}
          >
            Upload Dataset
          </Button>
        </Tooltip>
      </div>

      {datasets.length === 0 && !loading ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No datasets yet"
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
              disabled={!canUpload}
            >
              Upload Your First Dataset
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={datasets}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} datasets`,
            }}
          />
        </Card>
      )}

      <Modal
        title="Upload Dataset"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Text type="secondary">
            Upload CSV or Excel files. Data will be processed locally and stored securely on your machine.
          </Text>

          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <DatabaseOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for CSV, XLS, and XLSX files. Maximum file size: 100MB
            </p>
          </Upload.Dragger>

          <div>
            <Text strong>Supported formats:</Text>
            <ul>
              <li>CSV (.csv)</li>
              <li>Excel (.xlsx, .xls)</li>
            </ul>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Note: All data remains on your local machine. Only metadata is synced to the cloud.
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default ProjectDatasetsTab;