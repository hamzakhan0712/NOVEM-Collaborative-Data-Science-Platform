import React from 'react';
import { Empty, Typography } from 'antd';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Text } = Typography;

const WorkspaceActivityTab: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Text
            style={{
              fontSize: '13px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Activity feed coming soon
          </Text>
        }
      />
    </div>
  );
};

export default WorkspaceActivityTab;