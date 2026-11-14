import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useSettings, ModelTier } from '../../lib/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const ACADEMIC_LEVELS = [
  { value: 1, label: 'Year 1 (100)' },
  { value: 2, label: 'Year 2 (200)' },
  { value: 3, label: 'Year 3 (300)' },
  { value: 4, label: 'Year 4 (400)' },
  { value: 5, label: 'Year 5' },
  { value: 6, label: 'Year 6+' },
] as const;

export default function ProfileScreen() {
  const { profile, logout, refreshProfile } = useAuth();
  const { settings, colors, updateSettings } = useSettings();
  const router = useRouter();

  // Academic Settings Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(profile?.year_of_study || 1);
  const [degreeProgramme, setDegreeProgramme] = useState(profile?.degree_programme || '');
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);

  const openAcademicModal = () => {
    setSelectedYear(profile?.year_of_study || 1);
    setDegreeProgramme(profile?.degree_programme || '');
    setIsEditModalOpen(true);
  };

  const handleSaveAcademic = async () => {
    if (!profile?.id) return;
    setIsSavingAcademic(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          year_of_study: selectedYear,
          degree_programme: degreeProgramme.trim() || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      setIsEditModalOpen(false);
      Alert.alert('Saved', 'Academic level updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update academic profile.');
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const currentLevelLabel = ACADEMIC_LEVELS.find(l => l.value === (profile?.year_of_study || 1))?.label || `Year ${profile?.year_of_study || 1}`;

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

          {/* Academic Level Info Strip */}
          <View style={[styles.academicBox, { backgroundColor: colors.bgSubtle, borderColor: colors.border }]}>
            <View style={styles.academicRow}>
              <View>
                <Text style={[styles.academicSub, { color: colors.textSecondary }]}>Academic Level</Text>
                <Text style={[styles.academicVal, { color: colors.textPrimary }]}>{currentLevelLabel}</Text>
              </View>
              <TouchableOpacity
                style={[styles.editAcademicBtn, { backgroundColor: colors.primaryViolet + '20', borderColor: colors.primaryViolet + '40' }]}
                onPress={openAcademicModal}
              >
                <Ionicons name="pencil" size={13} color={colors.primaryViolet} style={{ marginRight: 4 }} />
                <Text style={[styles.editAcademicText, { color: colors.primaryViolet }]}>Change</Text>
              </TouchableOpacity>
            </View>
            {profile?.degree_programme ? (
              <Text style={[styles.programmeText, { color: colors.textMuted }]}>
                {profile.degree_programme}
              </Text>
            ) : null}
          </View>
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

      {/* Edit Academic Details Modal */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Academic Settings</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Select your current university level</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Academic Level</Text>
              <View style={styles.levelOptionsWrap}>
                {ACADEMIC_LEVELS.map(lvl => {
                  const isSelected = selectedYear === lvl.value;
                  return (
                    <TouchableOpacity
                      key={lvl.value}
                      style={[
                        styles.levelChoice,
                        {
                          backgroundColor: isSelected ? colors.primaryViolet + '20' : colors.bgSubtle,
                          borderColor: isSelected ? colors.primaryViolet : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedYear(lvl.value)}
                    >
                      <Text
                        style={[
                          styles.levelChoiceText,
                          { color: isSelected ? colors.primaryViolet : colors.textPrimary, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {lvl.label}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primaryViolet} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 14 }]}>Degree Programme</Text>
              <TextInput
                style={[styles.programmeInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                value={degreeProgramme}
                onChangeText={setDegreeProgramme}
                placeholder="e.g. BSc Computer Science"
                placeholderTextColor={colors.textMuted}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primaryViolet }]}
                onPress={handleSaveAcademic}
                disabled={isSavingAcademic}
              >
                {isSavingAcademic ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  academicBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
  },
  academicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  academicSub: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  academicVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  editAcademicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  editAcademicText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#88888830',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalBody: {
    marginVertical: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  levelOptionsWrap: {
    gap: 8,
  },
  levelChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  levelChoiceText: {
    fontSize: 14,
  },
  programmeInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#88888830',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

