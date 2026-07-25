import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useSettings } from '../../lib/SettingsContext';
import { Appearance } from 'react-native';

export default function FontScreen() {
  const { settings, updateSetting } = useSettings();
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && Appearance.getColorScheme() === 'dark');
  const colors = Colors[isDark ? 'dark' : 'light'];
  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dyslexia-Friendly Font</Text>
      <Text style={styles.description}>
        When enabled, the entire app will use the OpenDyslexic font, designed to mitigate some of the common reading errors caused by dyslexia.
      </Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Enable OpenDyslexic</Text>
            <Text style={styles.settingSub}>Switch font across all screens</Text>
          </View>
          <Switch 
            value={settings.font === 'opendyslexic'}
            onValueChange={(val) => updateSetting('font', val ? 'opendyslexic' : 'inter')}
            trackColor={{ false: '#767577', true: '#6b21a8' }}
          />
        </View>
      </View>

      <View style={[styles.previewCard, { marginTop: 24 }]}>
        <Text style={[styles.previewLabel, { fontFamily: settings.font === 'opendyslexic' ? 'opendyslexic' : 'inter' }]}>
          Preview
        </Text>
        <Text style={[styles.previewText, { fontFamily: settings.font === 'opendyslexic' ? 'opendyslexic' : 'inter' }]}>
          "Education is the most powerful weapon which you can use to change the world."
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontWeight: '600',
    color: colors.text,
  },
  settingSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 12,
    letterSpacing: 1,
  },
  previewText: {
    fontSize: 18,
    color: colors.text,
    lineHeight: 28,
  },
});
