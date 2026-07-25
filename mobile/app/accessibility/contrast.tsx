import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useSettings } from '../../lib/SettingsContext';
import { Appearance } from 'react-native';

export default function ContrastScreen() {
  const { settings, updateSetting } = useSettings();
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && Appearance.getColorScheme() === 'dark');
  
  // Use high contrast override if enabled
  const themeKey = isDark ? 'dark' : 'light';
  const colors = settings.contrast === 'high' 
    ? (isDark ? { ...Colors.dark, textMuted: '#FFFFFF', border: '#FFFFFF', card: '#000000', background: '#000000' } : { ...Colors.light, textMuted: '#000000', border: '#000000', card: '#FFFFFF', background: '#FFFFFF' })
    : Colors[themeKey];

  const styles = getStyles(colors, isDark, settings.contrast === 'high');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>High Contrast</Text>
      <Text style={styles.description}>
        Maximize the contrast between text and backgrounds to improve visibility. 
        This is especially helpful for low vision or color vision deficiencies.
      </Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Enable High Contrast</Text>
            <Text style={styles.settingSub}>Increases color contrast globally</Text>
          </View>
          <Switch 
            value={settings.contrast === 'high'}
            onValueChange={(val) => updateSetting('contrast', val ? 'high' : 'normal')}
            trackColor={{ false: '#767577', true: '#6b21a8' }}
          />
        </View>
      </View>

      <View style={[styles.previewCard, { marginTop: 24 }]}>
        <Text style={styles.previewLabel}>Preview</Text>
        <Text style={styles.previewText}>
          Standard text and <Text style={styles.mutedText}>muted text</Text> side-by-side. Notice how the contrast changes.
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean, isHighContrast: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'inter',
  },
  description: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: 'inter',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: isHighContrast ? colors.text : '#000',
    shadowOpacity: isHighContrast ? 1 : 0.05,
    shadowRadius: isHighContrast ? 0 : 8,
    elevation: isHighContrast ? 0 : 2,
    borderWidth: isHighContrast ? 2 : 0,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  settingSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: isHighContrast ? 'bold' : 'normal',
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: isHighContrast ? 2 : 1,
    borderColor: colors.border,
  },
  previewLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 12,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  previewText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  mutedText: {
    color: colors.textMuted,
    fontWeight: isHighContrast ? 'bold' : 'normal',
  }
});
