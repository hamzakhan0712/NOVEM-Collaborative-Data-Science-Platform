import React from 'react';
import { Card, Empty, Button } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

interface ProjectAnalysesTabProps {
  project: any;
}

const ProjectAnalysesTab: React.FC<ProjectAnalysesTabProps> = ({ }) => {
  return (
    <Card>
      <Empty
        description="No analyses yet"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" icon={<BarChartOutlined />}>
          Run Your First Analysis
        </Button>
      </Empty>
    </Card>
  );
};

export default ProjectAnalysesTab;