import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useSettings, ModelTier } from '../../lib/SettingsContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const { settings, colors, updateSettings } = useSettings();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of UniStudy AI?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleModelSelect = (tier: ModelTier) => {
    updateSettings({ selectedModelTier: tier });
  };

  const isDark = settings.theme === 'dark';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.avatarWrap, { backgroundColor: colors.primaryViolet }]}>
            <Text style={styles.avatarLetter}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {profile?.full_name || 'University Scholar'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {profile?.email}
          </Text>

          {profile?.institution_name && (
            <View style={[styles.badgePill, { backgroundColor: colors.bgSubtle }]}>
              <Ionicons name="school" size={14} color={colors.primaryViolet} style={{ marginRight: 6 }} />
              <Text style={[styles.badgeText, { color: colors.textPrimary }]}>
                {profile.institution_name}
              </Text>
            </View>
          )}

          {profile?.degree_programme && (
            <Text style={[styles.programmeText, { color: colors.textMuted }]}>
              {profile.degree_programme} • Year {profile.year_of_study || 1}
            </Text>
          )}
        </View>

        {/* AI Model Intelligence Tier */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>AI Tutor Model</Text>
          <View style={[styles.settingBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {[
              { id: 'default', title: 'Default (Balanced)', desc: 'Optimized for speed and accuracy' },
              { id: 'fast', title: 'Fast (Ultra-low latency)', desc: 'Quick slide summaries and flashcards' },
              { id: 'smart', title: 'Deep Reasoning', desc: 'Complex calculus, engineering and proof breakdowns' },
            ].map(m => {
              const active = settings.selectedModelTier === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.modelOption,
                    { borderBottomColor: colors.border },
                    active && { backgroundColor: colors.primaryViolet + '15' },
                  ]}
                  onPress={() => handleModelSelect(m.id as ModelTier)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modelTitle, { color: active ? colors.primaryViolet : colors.textPrimary }]}>
                      {m.title}
                    </Text>
                    <Text style={[styles.modelDesc, { color: colors.textSecondary }]}>{m.desc}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? colors.primaryViolet : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Accessibility & Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Accessibility & Network</Text>
          <View style={[styles.settingBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {/* Dark Theme */}
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <View style={styles.toggleInfo}>
                <Ionicons name="moon-outline" size={20} color={colors.textPrimary} style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Rich plum dark interface</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={val => updateSettings({ theme: val ? 'dark' : 'light' })}
                trackColor={{ false: colors.bgSubtle, true: colors.primaryViolet }}
              />
            </View>

            {/* High Contrast */}
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <View style={styles.toggleInfo}>
                <Ionicons name="contrast-outline" size={20} color={colors.textPrimary} style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>High Contrast</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Sharper borders and pure blacks</Text>
                </View>
              </View>
              <Switch
                value={settings.highContrast}
                onValueChange={val => updateSettings({ highContrast: val })}
                trackColor={{ false: colors.bgSubtle, true: colors.primaryViolet }}
              />
            </View>

            {/* Low Bandwidth Mode */}
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <View style={styles.toggleInfo}>
                <Ionicons name="cellular-outline" size={20} color={colors.textPrimary} style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Low-Bandwidth Mode</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Save data on mobile networks</Text>
                </View>
              </View>
              <Switch
                value={settings.lowBandwidth}
                onValueChange={val => updateSettings({ lowBandwidth: val })}
                trackColor={{ false: colors.bgSubtle, true: colors.primaryViolet }}
              />
            </View>

            {/* Dyslexia-friendly Font */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="text-outline" size={20} color={colors.textPrimary} style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Dyslexia-Friendly Font</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Enhanced character spacing</Text>
                </View>
              </View>
              <Switch
                value={settings.dyslexiaFont}
                onValueChange={val => updateSettings({ dyslexiaFont: val })}
                trackColor={{ false: colors.bgSubtle, true: colors.primaryViolet }}
              />
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#8C52FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  programmeText: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4,
  },
  settingBox: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modelTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  modelDesc: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

