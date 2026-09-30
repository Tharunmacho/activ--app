/**
 * LEGACY THEME — kept for the older screens (auth, BrowseMembers,
 * ApplicantDetail, components/*). Every value here is DERIVED from the design
 * kit in `src/ui/tokens.ts`, so old and new screens render as one app.
 * New code imports from `src/ui` instead (PALETTE / SPACE / RADIUS / SHADOW / TYPE).
 */
import { PALETTE, RADIUS, SHADOW } from '../ui/tokens';

export const COLORS = {
  // Primary Colors (ACTIV blue — same as PALETTE.blue)
  primary: PALETTE.blue,
  primaryDark: PALETTE.blueDark,
  primaryLight: '#60A5FA',

  // Secondary Colors
  secondary: PALETTE.amber,
  secondaryDark: '#D97706',
  secondaryLight: '#FCD34D',

  // Status Colors
  success: PALETTE.green,
  error: PALETTE.red,
  warning: PALETTE.amber,
  info: PALETTE.sky,

  // Application Status Colors
  pending: PALETTE.amber,
  approved: PALETTE.green,
  rejected: PALETTE.red,
  active: PALETTE.blue,

  // Neutral Colors
  white: PALETTE.white,
  black: PALETTE.black,
  background: PALETTE.canvas,
  surface: PALETTE.card,

  // Text Colors
  textPrimary: PALETTE.text,
  text: PALETTE.text,
  textSecondary: PALETTE.textMuted,
  textDisabled: PALETTE.textFaint,
  textHint: PALETTE.textFaint,

  // Border & Divider
  border: PALETTE.border,
  divider: PALETTE.divider,
  lightGray: PALETTE.field,

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  modalBackground: 'rgba(15, 23, 42, 0.6)',
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

// Already on the 4-pt grid. SPACING.md (16) == SPACE.lg — the screen gutter.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: RADIUS.xs,
  md: RADIUS.sm,
  lg: RADIUS.md,
  xl: RADIUS.lg,
  round: RADIUS.pill,
};

export const SHADOWS = {
  sm: SHADOW.card,
  md: SHADOW.md,
  lg: SHADOW.lifted,
};

export const SCREEN_PADDING = SPACING.md;
