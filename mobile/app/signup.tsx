import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, useColorScheme, ActivityIndicator, Modal, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Colors, useThemeColors } from '../constants/Colors';
import { isPasswordLeaked } from '../utils/passwordLeak';
import Constants from 'expo-constants';
import { uploadAvatar } from '../utils/avatarUpload';
import * as ImagePicker from 'expo-image-picker';

const STUDY_FREQUENCIES = [
  { id: 'daily', label: 'Daily', icon: 'sunny-outline' as const },
  { id: 'weekdays', label: 'Weekdays', icon: 'calendar-outline' as const },
  { id: 'weekends', label: 'Weekends', icon: 'calendar-number-outline' as const },
  { id: 'custom', label: 'Custom', icon: 'shuffle-outline' as const },
  { id: 'flexible', label: 'Flexible', icon: 'time-outline' as const },
];

const YEAR_LEVELS = ['100', '200', '300', '400', '500', '600', '700', '800'];

export default function SignupScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  // Step management
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Username availability
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Password strength
  const passwordStrength = getPasswordStrength(password);

  // Step 2 fields
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

  const [studyFrequency, setStudyFrequency] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [frequencyModalVisible, setFrequencyModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);

  // Debounced username check against Supabase directly
  useEffect(() => {
    if (usernameTimeout.current) clearTimeout(usernameTimeout.current);

    const cleaned = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned !== username) setUsername(cleaned);

    if (!cleaned || cleaned.length < 3) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      setUsernameChecking(false);
      return;
    }

    setUsernameChecking(true);
    usernameTimeout.current = setTimeout(async () => {
      try {
        const debuggerHost = Constants.expoConfig?.hostUri;
        const localIp = debuggerHost?.split(':')[0];
        const apiUrl = localIp ? `http://${localIp}:3000/api/profile/check-username?username=${encodeURIComponent(cleaned)}` : `https://unistudy-ai.vercel.app/api/profile/check-username?username=${encodeURIComponent(cleaned)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data.available === true) {
          setUsernameAvailable(true);
          setUsernameSuggestions([]);
        } else if (data.available === false) {
          setUsernameAvailable(false);
          setUsernameSuggestions(data.suggestions || []);
        } else {
          setUsernameAvailable(null); // Fallback on error
        }
      } catch (err) {
        console.error("Username check failed", err);
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => {
      if (usernameTimeout.current) clearTimeout(usernameTimeout.current);
    };
  }, [username]);

  // Fetch institutions and programmes when stepping to step 2
  useEffect(() => {
    if (step !== 2) return;

    async function fetchLookups() {
      const [instResult, progResult] = await Promise.all([
        supabase.from('institutions').select('id, name').order('name'),
        supabase.from('course_programmes').select('id, name, field').order('name'),
      ]);
      if (instResult.data) setInstitutions(instResult.data);
      setInstitutionsLoading(false);
      if (progResult.data) setProgrammes(progResult.data);
      setProgrammesLoading(false);
    }
    fetchLookups();
  }, [step]);

  const canProceedStep1 = username.length >= 3 && usernameAvailable === true && name.trim().length > 0 && email.includes('@') && passwordStrength.score >= 2;

  const handleNext = () => {
    if (!canProceedStep1) {
      let msg = '';
      if (username.length < 3) msg = 'Username must be at least 3 characters.';
      else if (usernameAvailable !== true) msg = 'Pick an available username.';
      else if (!name.trim()) msg = 'Full name is required.';
      else if (!email.includes('@')) msg = 'Enter a valid email address.';
      else if (passwordStrength.score < 2) msg = 'Password is too weak. Use at least 8 characters with mixed case and a number.';
      Alert.alert('Missing info', msg);
      return;
    }
    setStep(2);
  };

  const handleSignup = async () => {
    if (!selectedInstitution) {
      Alert.alert('Missing info', 'Select your institution.');
      return;
    }
    const leaked = await isPasswordLeaked(password);
    if (leaked) {
      Alert.alert('Unsafe password', 'This password appears in known data breaches. Choose a different password.');
      return;
    }
    if (!selectedProgramme) {
      Alert.alert('Missing info', 'Select your degree programme.');
      return;
    }
    if (!studyFrequency) {
      Alert.alert('Missing info', 'Pick how often you study.');
      return;
    }
    if (!yearOfStudy) {
      Alert.alert('Missing info', 'Select your year of study.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: name,
          institution_id: selectedInstitution.id,
          degree_programme: selectedProgramme,
          study_frequency: studyFrequency,
          year_of_study: yearOfStudy,
        },
      },
    });

    if (error) {
      Alert.alert('Signup failed', error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace('/onboarding');
    } else {
      Alert.alert('Account created', 'Check your email for verification.');
      router.replace('/login');
    }
  };

  const filteredInstitutions = institutions.filter(i =>
    i.name.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  const filteredProgrammes = programmes.filter(p =>
    p.name.toLowerCase().includes(programmeSearch.toLowerCase())
  );

  const selectedFreqLabel = STUDY_FREQUENCIES.find(f => f.id === studyFrequency)?.label;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => step === 2 ? setStep(1) : router.back()}
        >
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={[styles.progressBar, step === 2 && styles.progressBarActive]} />
          <View style={[styles.progressDot, step === 2 && styles.progressActive]} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{step === 1 ? 'Create Account' : 'Academic Details'}</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Set up your profile to get started.'
              : 'Tell us about your studies so we can personalise your experience.'}
          </Text>
        </View>

        {step === 1 ? (
          <View style={styles.form}>
            <TouchableOpacity onPress={async () => {
              const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permissionResult.granted) {
                Alert.alert('Permission required', 'Camera roll permission is needed to select an avatar.');
                return;
              }
              const pickerResult = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.7,
                });
                if (!pickerResult.canceled) {
                  // Upload to Cloudinary
                  const uri = pickerResult.assets && pickerResult.assets[0] && pickerResult.assets[0].uri ? pickerResult.assets[0].uri : null;
                  if (uri) {
                    const uploadedUrl = await uploadAvatar(uri);
                    if (uploadedUrl) {
                      setProfile((prev: any) => ({ ...prev, avatar_url: uploadedUrl }));
                      Alert.alert('Avatar uploaded', 'Your avatar has been saved.');
                    } else {
                      Alert.alert('Upload failed', 'Could not upload avatar.');
                    }
                  }
                }
            }} style={styles.avatar}> 
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {name?.charAt(0)?.toUpperCase() || 'S'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="at-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="janedoe"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
              <View style={styles.inputRight}>
                {usernameChecking && <ActivityIndicator size="small" color={colors.textMuted} />}
                {!usernameChecking && usernameAvailable === true && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <Ionicons name="close-circle" size={22} color={colors.destructive} />
                )}
              </View>
            </View>
            {!usernameChecking && usernameAvailable === false && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionLabel}>Already taken. Try one of these:</Text>
                <View style={styles.suggestionsRow}>
                  {usernameSuggestions.map(s => (
                    <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => setUsername(s)}>
                      <Text style={styles.suggestionChipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Jane Doe"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="student@university.edu"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarTrack}>
                  <View style={[styles.strengthBarFill, { width: `${(passwordStrength.score / 4) * 100}%`, backgroundColor: passwordStrength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, !canProceedStep1 && styles.buttonDisabled]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Institution</Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setInstitutionModalVisible(true)}>
              <Ionicons name="business-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.selectorText, selectedInstitution && { color: colors.text }]}>
                {selectedInstitution?.name || 'Search your university...'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={styles.label}>Degree Programme</Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setProgrammeModalVisible(true)}>
              <Ionicons name="school-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.selectorText, selectedProgramme && { color: colors.text }]} numberOfLines={1}>
                {selectedProgramme || 'e.g. Computer Science'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={styles.label}>Study Frequency</Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setFrequencyModalVisible(true)}>
              <Ionicons name="calendar-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.selectorText, studyFrequency && { color: colors.text }]}>
                {selectedFreqLabel || 'How often do you study?'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={styles.label}>Year of Study</Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setYearModalVisible(true)}>
              <Ionicons name="trending-up-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.selectorText, yearOfStudy && { color: colors.text }]}>
                {yearOfStudy ? `Level ${yearOfStudy}` : 'Select level'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.footerLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              ListEmptyComponent={
                <Text style={styles.emptyText}>No institutions found.</Text>
              }
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
              ListEmptyComponent={
                <Text style={styles.emptyText}>No programmes found.</Text>
              }
            />
          )}
        </View>
      </Modal>

      {/* Study Frequency Bottom Sheet */}
      <Modal visible={frequencyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBottom, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { marginBottom: 16 }]}>Study Frequency</Text>
            {STUDY_FREQUENCIES.map(freq => (
              <TouchableOpacity
                key={freq.id}
                style={styles.modalItem}
                onPress={() => {
                  setStudyFrequency(freq.id);
                  setFrequencyModalVisible(false);
                }}
              >
                <Ionicons name={freq.icon} size={20} color={colors.textMuted} style={{ marginRight: 12 }} />
                <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{freq.label}</Text>
                {studyFrequency === freq.id && (
                  <Ionicons name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalItem, { justifyContent: 'center', marginTop: 10 }]}
              onPress={() => setFrequencyModalVisible(false)}
            >
              <Text style={{ color: colors.destructive, fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Year of Study Bottom Sheet */}
      <Modal visible={yearModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBottom, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { marginBottom: 16 }]}>Year of Study</Text>
            {YEAR_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={styles.modalItem}
                onPress={() => {
                  setYearOfStudy(level);
                  setYearModalVisible(false);
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>Level {level}</Text>
                {yearOfStudy === level && (
                  <Ionicons name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalItem, { justifyContent: 'center', marginTop: 10 }]}
              onPress={() => setYearModalVisible(false)}
            >
              <Text style={{ color: colors.destructive, fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#888' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Very weak', color: '#D32F2F' },
    1: { label: 'Weak', color: '#F57C00' },
    2: { label: 'Fair', color: '#FBC02D' },
    3: { label: 'Good', color: '#7CB342' },
    4: { label: 'Strong', color: '#388E3C' },
  };

  return { score, ...map[score] };
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
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
    width: 80,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  progressBarActive: {
    backgroundColor: colors.tint,
  },
  institutionCardSelected: {
    borderColor: colors.tint,
    backgroundColor: isDark ? '#1a1f33' : '#F0F4FF',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarText: {
    fontSize: 24,
    color: colors.textMuted
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 18,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: '100%',
  },
  inputRight: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    marginTop: -10,
    marginBottom: 16,
    paddingLeft: 4,
  },
  suggestionLabel: {
    fontSize: 12,
    color: colors.destructive,
    marginBottom: 8,
    fontWeight: '500',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: isDark ? 'rgba(155,114,207,0.15)' : '#EDE7F6',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(155,114,207,0.3)' : '#D1C4E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  suggestionChipText: {
    fontSize: 13,
    color: colors.tint,
    fontWeight: '600',
  },
  strengthContainer: {
    marginTop: -10,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  strengthBarTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 18,
    paddingHorizontal: 16,
    height: 56,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.textMuted,
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 20,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  footerLink: {
    color: colors.tint,
    fontWeight: 'bold',
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBottom: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
});
