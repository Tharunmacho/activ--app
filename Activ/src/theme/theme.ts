export const COLORS = {
  // Primary Colors
  primary: '#1E88E5',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  
  // Secondary Colors
  secondary: '#FF9800',
  secondaryDark: '#F57C00',
  secondaryLight: '#FFB74D',
  
  // Status Colors
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',
  info: '#2196F3',
  
  // Application Status Colors
  pending: '#FFC107',
  approved: '#4CAF50',
  rejected: '#F44336',
  active: '#2196F3',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  
  // Text Colors
  textPrimary: '#212121',
  text: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  textHint: '#9E9E9E',
  
  // Border & Divider
  border: '#E0E0E0',
  divider: '#EEEEEE',
  lightGray: '#F5F5F5',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: 'rgba(0, 0, 0, 0.6)',
};

export const FONTS = {
  // Font Families
  regular: 'System',
  medium: 'System',
  bold: 'System',
  
  // Font Sizes
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    huge: 36,
  },
  
  // Font Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
  
  // Text Styles
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export const SCREEN_PADDING = SPACING.md;
