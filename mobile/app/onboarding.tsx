import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, Alert, Animated, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Colors, useThemeColors } from '../constants/Colors';

const TUTOR_PERSONALITIES = [
  { id: 'encouraging', label: 'Encouraging' },
  { id: 'strict', label: 'Strict' },
  { id: 'socratic', label: 'Socratic (Questions)' },
  { id: 'direct', label: 'Direct' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Academic Details
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [institutionModalVisible, setInstitutionModalVisible] = useState(false);
  const [institutionsLoading, setInstitutionsLoading] = useState(true);

  const [programmes, setProgrammes] = useState<any[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [programmeSearch, setProgrammeSearch] = useState('');
  const [programmeModalVisible, setProgrammeModalVisible] = useState(false);
  const [programmesLoading, setProgrammesLoading] = useState(true);

  // Step 2: Learning Style
  const [learningStyle, setLearningStyle] = useState('adaptive');

  // Step 3: Tutor Setup
  const [tutorName, setTutorName] = useState('Alex');
  const [tutorPersonality, setTutorPersonality] = useState('encouraging');

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function fetchLookups() {
      try {
        const apiRes = await fetch('https://list-of-universities-in-ghana.onrender.com/universities');
        const apiData = await apiRes.json();
        const institutionsData = apiData.universities || apiData;
        const formattedInstitutions = institutionsData.map((inst: any) => ({
          id: inst.name,
          name: inst.name,
        }));
        setInstitutions(formattedInstitutions);
        setInstitutionsLoading(false);
      } catch (error) {
        console.error('Failed to fetch institutions from API:', error);
        setInstitutionsLoading(false);
      }

      try {
        const progResult = await supabase.from('course_programmes').select('id, name, field').order('name');
        if (progResult.data) setProgrammes(progResult.data);
        setProgrammesLoading(false);
      } catch (error) {
        console.error('Failed to fetch programmes:', error);
        setProgrammesLoading(false);
      }
    }
    fetchLookups();
  }, []);

  const animateToStep = (nextStep: number) => {
    if (step === 1 && nextStep === 2) {
      if (!selectedInstitution) {
        Alert.alert('Missing info', 'Select your institution.');
        return;
      }
      if (!selectedProgramme) {
        Alert.alert('Missing info', 'Select your degree programme.');
        return;
      }
    }

    const direction = nextStep > step ? 1 : -1;
    Animated.timing(slideAnim, {
      toValue: direction * -300,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(direction * 300);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleComplete = async () => {
    if (!tutorName.trim()) {
      Alert.alert('Missing info', 'Give your AI tutor a name.');
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        institution_id: selectedInstitution.id,
        degree_programme: selectedProgramme,
        learning_style: learningStyle,
        tutor_name: tutorName.trim(),
        tutor_personality: tutorPersonality,
      })
      .eq('id', user!.id);

    if (error) {
      Alert.alert('Error', 'Failed to save preferences. Try again.');
      setSaving(false);
      return;
    }

    // Sync AI tutor settings to user_settings so the AI engine picks them up
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user!.id,
        ai_tutor_name: tutorName.trim(),
        ai_personality: tutorPersonality,
      });

    router.replace('/(tabs)');
  };

  const filteredInstitutions = institutions.filter(i =>
    i.name.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  const filteredProgrammes = programmes.filter(p =>
    p.name.toLowerCase().includes(programmeSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={[styles.progressBar, step >= 2 && styles.progressBarActive]} />
        <View style={[styles.progressDot, step >= 2 && styles.progressActive]} />
      </View>

      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        {step === 1 ? (
          <>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.title}>Academic Details</Text>
            <Text style={styles.subtitle}>Tell us about your studies.</Text>

            <View style={styles.form}>
              <Text style={styles.fieldLabel}>Institution</Text>
              <TouchableOpacity style={styles.selectorButton} onPress={() => setInstitutionModalVisible(true)}>
                <Ionicons name="business-outline" size={20} color={colors.textMuted} style={{ marginRight: 12 }} />
                <Text style={[styles.selectorText, selectedInstitution && { color: colors.text }]}>
                  {selectedInstitution?.name || 'Search your university...'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Programme of Study</Text>
              <TouchableOpacity style={styles.selectorButton} onPress={() => setProgrammeModalVisible(true)}>
                <Ionicons name="school-outline" size={20} color={colors.textMuted} style={{ marginRight: 12 }} />
                <Text style={[styles.selectorText, selectedProgramme && { color: colors.text }]} numberOfLines={1}>
                  {selectedProgramme || 'e.g. Computer Science'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => animateToStep(2)}>
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.title}>Your AI Tutor</Text>
            <Text style={styles.subtitle}>Give your study companion a name and personality.</Text>

            <Text style={styles.fieldLabel}>Tutor Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Alex"
                placeholderTextColor={colors.textMuted}
                value={tutorName}
                onChangeText={setTutorName}
              />
            </View>

            <Text style={styles.fieldLabel}>Personality</Text>
            <View style={styles.personalityGrid}>
              {TUTOR_PERSONALITIES.map(tp => (
                <TouchableOpacity
                  key={tp.id}
                  style={[styles.personalityChip, tutorPersonality === tp.id && styles.personalityChipSelected]}
                  onPress={() => setTutorPersonality(tp.id)}
                >
                  <Text style={[styles.personalityChipText, tutorPersonality === tp.id && styles.personalityChipTextSelected]}>
                    {tp.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => animateToStep(1)}>
                <Ionicons name="arrow-back" size={20} color={colors.text} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginTop: 0 }, saving && { opacity: 0.5 }]}
                onPress={handleComplete}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Get Started'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      {/* Institution Search Modal */}
      <Modal visible={institutionModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Institution</Text>
            <TouchableOpacity onPress={() => setInstitutionModalVisible(false)}>
              <Text style={{ color: colors.tint, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search universities..."
              placeholderTextColor={colors.textMuted}
              value={institutionSearch}
              onChangeText={setInstitutionSearch}
              autoFocus
            />
          </View>
          {institutionsLoading ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredInstitutions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedInstitution(item);
                    setInstitutionModalVisible(false);
                    setInstitutionSearch('');
                  }}
                >
                  <Ionicons name="business" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{item.name}</Text>
                  {selectedInstitution?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color={colors.tint} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No institutions found.</Text>}
            />
          )}
        </View>
      </Modal>

      {/* Programme Search Modal */}
      <Modal visible={programmeModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Programme</Text>
            <TouchableOpacity onPress={() => setProgrammeModalVisible(false)}>
              <Text style={{ color: colors.tint, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search programmes..."
              placeholderTextColor={colors.textMuted}
              value={programmeSearch}
              onChangeText={setProgrammeSearch}
              autoFocus
            />
          </View>
          {programmesLoading ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredProgrammes.slice(0, 50)}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedProgramme(item.name);
                    setProgrammeModalVisible(false);
                    setProgrammeSearch('');
                  }}
                >
                  <Ionicons name="school" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>{item.name}</Text>
                    {item.field && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.field}</Text>}
                  </View>
                  {selectedProgramme === item.name && (
                    <Ionicons name="checkmark" size={20} color={colors.tint} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No programmes found.</Text>}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  progressActive: {
    backgroundColor: colors.tint,
  },
  progressBar: {
    width: 60,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  progressBarActive: {
    backgroundColor: colors.tint,
  },
  content: {
    flex: 1,
  },
  stepBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(155,114,207,0.2)' : '#EDE7F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.tint,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 28,
    lineHeight: 22,
  },
  form: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 56,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: '100%',
  },
  optionsGroup: {
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: colors.tint,
    backgroundColor: isDark ? 'rgba(155,114,207,0.08)' : '#F5F0FF',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  optionLabelSelected: {
    color: colors.tint,
    fontWeight: '600',
  },
  personalityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 36,
  },
  personalityChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  personalityChipSelected: {
    borderColor: colors.tint,
    backgroundColor: isDark ? 'rgba(155,114,207,0.12)' : '#F5F0FF',
  },
  personalityChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  personalityChipTextSelected: {
    color: colors.tint,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.tint,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  skipText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  // Modals
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
    height: '100%',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 40,
    fontSize: 15,
  },
});
