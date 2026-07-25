import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { useSettings } from '../lib/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { Appearance } from 'react-native';

export default function AccessibilityScreen() {
  const { settings, updateSetting } = useSettings();
  
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && Appearance.getColorScheme() === 'dark');
  const colors = Colors[isDark ? 'dark' : 'light'];
  const styles = getStyles(colors, isDark);
  const router = require('expo-router').useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.headerTitle}>Accessibility Settings</Text>
      <Text style={styles.description}>
        Customize your experience to make learning more comfortable.
      </Text>

      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/accessibility/font')}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#3E2723' : '#EFEBE9' }]}>
              <Ionicons name="text" size={20} color={isDark ? '#D7CCC8' : '#795548'} />
            </View>
            <View>
              <Text style={styles.settingTitle}>Dyslexia-Friendly Font</Text>
              <Text style={styles.settingSub}>Configure typography for readability</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/accessibility/contrast')}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#004D40' : '#E0F2F1' }]}>
              <Ionicons name="contrast" size={20} color={isDark ? '#80CBC4' : '#00796B'} />
            </View>
            <View>
              <Text style={styles.settingTitle}>High Contrast</Text>
              <Text style={styles.settingSub}>Adjust contrast and color inversion</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/accessibility/bandwidth')}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#4A148C' : '#F3E5F5' }]}>
              <Ionicons name="cellular" size={20} color={isDark ? '#CE93D8' : '#8E24AA'} />
            </View>
            <View>
              <Text style={styles.settingTitle}>Low Bandwidth Mode</Text>
              <Text style={styles.settingSub}>Manage data usage and media</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/accessibility/ui')}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1B5E20' : '#E8F5E9' }]}>
              <Ionicons name="grid" size={20} color={isDark ? '#A5D6A7' : '#388E3C'} />
            </View>
            <View>
              <Text style={styles.settingTitle}>Simplified UI</Text>
              <Text style={styles.settingSub}>Configure interface complexity</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/accessibility/ai')}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#FF6F0020' : '#FFF8E1' }]}>
              <Ionicons name="person" size={20} color={isDark ? '#FFD54F' : '#FFA000'} />
            </View>
            <View>
              <Text style={styles.settingTitle}>AI Tutor Personalization</Text>
              <Text style={styles.settingSub}>Configure learning adaptations</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'inter', // As per tokens
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'inter',
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'inter',
  },
  settingSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'inter',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
});
