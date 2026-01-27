import { ThemeConfig, theme } from 'antd';

// Color palette
export const colors = {
  // Primary colors
  primary: '#1a1a1a',
  primaryHover: '#2a2a2a',
  primaryActive: '#0a0a0a',
  
  // Logo colors
  logoCyan: '#00C853',
  logoCyanLight: '#69F0AE',
  logoCyanDark: '#00A043',
  
  // Text colors - Light theme
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#cccccc',
  
  // Text colors - Dark theme
  textPrimaryDark: '#ffffff',
  textSecondaryDark: '#b3b3b3',
  textTertiaryDark: '#808080',
  textDisabledDark: '#4d4d4d',
  
  // Background colors - Light theme
  backgroundPrimary: '#ffffff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#e8e8e8',
  
  // Background colors - Dark theme
  backgroundPrimaryDark: '#0a0a0a',
  backgroundSecondaryDark: '#141414',
  backgroundTertiaryDark: '#1f1f1f',
  
  // Surface colors
  surfaceLight: '#ffffff',
  surfaceDark: '#1a1a1a',
  
  // Border colors
  border: '#e0e0e0',
  borderSecondary: '#f0f0f0',
  borderDark: '#2a2a2a',
  
  // State colors
  success: '#00C853',
  successLight: '#69F0AE',
  error: '#f5222d',
  errorLight: '#ff7875',
  warning: '#faad14',
  warningLight: '#ffd666',
  info: '#1890ff',
  infoLight: '#69b1ff',
  
  // Hover states
  hover: '#fafafa',
  hoverDark: '#1f1f1f',
  
  // Shadow
  shadow: '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 4px rgba(0, 0, 0, 0.04)',
  shadowMedium: '0 2px 8px rgba(0, 0, 0, 0.06)',
  shadowLarge: '0 4px 16px rgba(0, 0, 0, 0.08)',
  
  shadowDark: '0 1px 2px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.20)',
  shadowMediumDark: '0 2px 8px rgba(0, 0, 0, 0.25)',
  shadowLargeDark: '0 4px 16px rgba(0, 0, 0, 0.30)',
};

export const lightTheme: ThemeConfig = {
  token: {
    // Colors
    colorPrimary: colors.logoCyan,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    
    // Typography
    colorText: colors.textPrimary,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textTertiary,
    colorTextDisabled: colors.textDisabled,
    
    // Background
    colorBgContainer: colors.backgroundPrimary,
    colorBgElevated: colors.backgroundPrimary,
    colorBgLayout: colors.backgroundSecondary,
    
    // Border
    colorBorder: colors.border,
    colorBorderSecondary: colors.borderSecondary,
    
    // Border radius
    borderRadius: 4,
    borderRadiusLG: 6,
    borderRadiusSM: 3,
    borderRadiusXS: 2,
    
    // Shadows
    boxShadow: colors.shadow,
    boxShadowSecondary: colors.shadowMedium,
    
    // Font
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 4,
      controlHeight: 36,
      controlHeightLG: 40,
      controlHeightSM: 28,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 4,
      controlHeight: 36,
    },
    Card: {
      borderRadiusLG: 4,
      boxShadow: colors.shadow,
    },
    Menu: {
      itemBorderRadius: 4,
      itemMarginInline: 8,
      itemSelectedBg: colors.hover,
      itemSelectedColor: colors.textPrimary,
      itemHoverBg: colors.hover,
      itemHoverColor: colors.textPrimary,
      itemBg: 'transparent',
    },
    Layout: {
      headerBg: colors.primary,
      siderBg: colors.backgroundPrimary,
      bodyBg: colors.backgroundSecondary,
    },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // Colors
    colorPrimary: colors.logoCyan,
    colorSuccess: colors.successLight,
    colorWarning: colors.warningLight,
    colorError: colors.errorLight,
    colorInfo: colors.infoLight,
    
    // Typography
    colorText: colors.textPrimaryDark,
    colorTextSecondary: colors.textSecondaryDark,
    colorTextTertiary: colors.textTertiaryDark,
    colorTextDisabled: colors.textDisabledDark,
    
    // Background
    colorBgContainer: colors.backgroundPrimaryDark,
    colorBgElevated: colors.surfaceDark,
    colorBgLayout: colors.backgroundSecondaryDark,
    
    // Border
    colorBorder: colors.borderDark,
    colorBorderSecondary: colors.borderDark,
    
    // Border radius
    borderRadius: 4,
    borderRadiusLG: 6,
    borderRadiusSM: 3,
    borderRadiusXS: 2,
    
    // Shadows
    boxShadow: colors.shadowDark,
    boxShadowSecondary: colors.shadowMediumDark,
    
    // Font
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 4,
      controlHeight: 36,
      controlHeightLG: 40,
      controlHeightSM: 28,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 4,
      controlHeight: 36,
    },
    Card: {
      borderRadiusLG: 4,
      boxShadow: colors.shadowDark,
    },
    Menu: {
      itemBorderRadius: 4,
      itemMarginInline: 8,
      itemSelectedBg: colors.hoverDark,
      itemSelectedColor: colors.textPrimaryDark,
      itemHoverBg: colors.hoverDark,
      itemHoverColor: colors.textPrimaryDark,
      itemBg: 'transparent',
    },
    Layout: {
      headerBg: colors.backgroundPrimaryDark,
      siderBg: colors.backgroundSecondaryDark,
      bodyBg: colors.backgroundSecondaryDark,
    },
  },
};