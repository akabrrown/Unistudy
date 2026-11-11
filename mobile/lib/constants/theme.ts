// UniStudy AI - Mobile Design Tokens & Theme System
// Replicating public website dark/light palettes and accessibility tokens

export const Palette = {
  // Brand Plum & Violets
  primaryPlum: '#5B2D8E',
  primaryViolet: '#8C52FF',
  primaryLight: '#EDE7F6',
  plumHover: '#4B2278',
  plumDeep: '#3D1A6E',
  plumBorder: 'rgba(140, 82, 255, 0.25)',

  // Dark Theme (Default for UniStudy)
  dark: {
    bgPage: '#0B0814',
    bgCard: '#150F26',
    bgSubtle: '#21183E',
    bgInput: '#1A1330',
    border: 'rgba(255, 255, 255, 0.08)',
    borderActive: 'rgba(140, 82, 255, 0.5)',
    textPrimary: '#FFFFFF',
    textSecondary: '#A79EC2',
    textMuted: '#6E6489',
    cardShadow: 'rgba(0, 0, 0, 0.4)',
  },

  // Light Theme
  light: {
    bgPage: '#FAF8FF',
    bgCard: '#FFFFFF',
    bgSubtle: '#F3EEFA',
    bgInput: '#FFFFFF',
    border: '#E8E1F2',
    borderActive: '#5B2D8E',
    textPrimary: '#1A0A2E',
    textSecondary: '#5A4E70',
    textMuted: '#8C80A3',
    cardShadow: 'rgba(91, 45, 142, 0.08)',
  },

  // High Contrast Overrides
  highContrast: {
    dark: {
      bgPage: '#000000',
      bgCard: '#121212',
      bgSubtle: '#1E1E1E',
      border: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#EEEEEE',
      textMuted: '#CCCCCC',
    },
    light: {
      bgPage: '#FFFFFF',
      bgCard: '#FFFFFF',
      bgSubtle: '#EEEEEE',
      border: '#000000',
      textPrimary: '#000000',
      textSecondary: '#111111',
      textMuted: '#333333',
    }
  },

  // Functional Semantic Colors
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.15)',
};

export interface ThemeColors {
  bgPage: string;
  bgCard: string;
  bgSubtle: string;
  bgInput: string;
  border: string;
  borderActive: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryViolet: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  isDark: boolean;
}

export function getThemeColors(isDark: boolean, isHighContrast: boolean = false): ThemeColors {
  if (isHighContrast) {
    const contrast = isDark ? Palette.highContrast.dark : Palette.highContrast.light;
    return {
      ...contrast,
      bgInput: contrast.bgSubtle,
      borderActive: contrast.border,
      primary: isDark ? '#FFFFFF' : '#000000',
      primaryViolet: isDark ? '#C499FF' : '#5B2D8E',
      success: Palette.success,
      warning: Palette.warning,
      error: Palette.error,
      info: Palette.info,
      isDark,
    };
  }

  const base = isDark ? Palette.dark : Palette.light;
  return {
    ...base,
    primary: isDark ? Palette.primaryViolet : Palette.primaryPlum,
    primaryViolet: Palette.primaryViolet,
    success: Palette.success,
    warning: Palette.warning,
    error: Palette.error,
    info: Palette.info,
    isDark,
  };
}
