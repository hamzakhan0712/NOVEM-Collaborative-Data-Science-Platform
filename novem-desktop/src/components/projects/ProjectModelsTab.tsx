import React from 'react';
import { Card, Empty, Button } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

interface ProjectModelsTabProps {
  project: any;
}

const ProjectModelsTab: React.FC<ProjectModelsTabProps> = ({ }) => {
  return (
    <Card>
      <Empty
        description="No models yet"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" icon={<RobotOutlined />}>
          Train Your First Model
        </Button>
      </Empty>
    </Card>
  );
};

export default ProjectModelsTab;