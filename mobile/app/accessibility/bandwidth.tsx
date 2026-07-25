import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useSettings } from '../../lib/SettingsContext';
import { Appearance } from 'react-native';

export default function BandwidthScreen() {
  const { settings, updateSetting } = useSettings();
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && Appearance.getColorScheme() === 'dark');
  const colors = Colors[isDark ? 'dark' : 'light'];
  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Low Bandwidth Mode</Text>
      <Text style={styles.description}>
        Optimize UniStudy for slow internet or older devices.
      </Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Enable Low Bandwidth</Text>
            <Text style={styles.settingSub}>
              Compresses slide images, disables prefetching, and turns off animations to save mobile data.
            </Text>
          </View>
          <Switch 
            value={settings.lowBandwidth}
            onValueChange={(val) => updateSetting('lowBandwidth', val)}
            trackColor={{ false: '#767577', true: '#6b21a8' }}
          />
        </View>
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
    marginTop: 6,
    lineHeight: 18,
  },
});
