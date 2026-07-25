import { useColorScheme } from 'react-native';
import { useSettings } from '../lib/SettingsContext';

const tintColorLight = '#5B2D8E';
const tintColorDark = '#9B72CF';

export const Colors = {
  light: {
    text: '#1A0A2E',
    textMuted: '#6B5A8A',
    background: '#FAF8FF',
    card: '#FFFFFF',
    border: '#D1C4E9',
    tint: tintColorLight,
    tabIconDefault: '#9E8CB5',
    tabIconSelected: tintColorLight,
    accent: '#EDE7F6',
    destructive: '#D32F2F',
    success: '#388E3C',
    warning: '#F57C00',
    input: '#F5F3FA',
  },
  dark: {
    text: '#FFFFFF',
    textMuted: '#B39DDB',
    background: '#0F0C29',
    card: '#1A0A2E',
    border: 'rgba(255,255,255,0.1)',
    tint: tintColorDark,
    tabIconDefault: '#6B5A8A',
    tabIconSelected: tintColorDark,
    accent: 'rgba(91,45,142,0.4)',
    destructive: '#EF5350',
    success: '#A5D6A7',
    warning: '#FFB74D',
    input: 'rgba(255,255,255,0.05)',
  },
};

export const HighContrastColors = {
  light: {
    ...Colors.light,
    textMuted: '#1A0A2E', // Stark black for muted text
    border: '#000000',
    tint: '#000000',
    tabIconDefault: '#1A0A2E',
    tabIconSelected: '#000000',
  },
  dark: {
    ...Colors.dark,
    textMuted: '#FFFFFF', // Stark white for muted text
    border: '#FFFFFF',
    tint: '#FFFFFF',
    tabIconDefault: '#FFFFFF',
    tabIconSelected: '#FFFFFF',
  }
};

export function useThemeColors() {
  const theme = useColorScheme() ?? 'light';
  const { settings } = useSettings();
  
  if (settings.contrast === 'high') {
    return HighContrastColors[theme];
  }
  return Colors[theme];
}
