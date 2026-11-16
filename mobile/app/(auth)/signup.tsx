import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useSettings } from '../../lib/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UPSA_INSTITUTION, UPSA_FACULTIES, UPSAFaculty } from '../../lib/constants/upsa';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<UPSAFaculty | null>(UPSA_FACULTIES[0]);
  const [degreeProgramme, setDegreeProgramme] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isProgrammeModalOpen, setIsProgrammeModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signup } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();

  const handleSignup = async () => {
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid UPSA student email address.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long (and max 128).');
      return;
    }
    if (password.length > 128) {
      setErrorMessage('Password cannot exceed 128 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signup({
        fullName,
        email,
        password,
        institutionId: UPSA_INSTITUTION.id,
        faculty: selectedFaculty?.code || undefined,
        degreeProgramme: degreeProgramme.trim() || undefined,
        yearOfStudy,
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to create account.');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create Your Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join your UPSA peers and elevate your study materials with AI.
            </Text>
          </View>

          {/* UPSA Institution Verified Badge */}
          <View style={[styles.upsaBadge, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.upsaIconWrap}>
              <Ionicons name="school" size={22} color="#8C52FF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.upsaBadgeTitle, { color: colors.textPrimary }]}>
                  {UPSA_INSTITUTION.name}
                </Text>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedText}>UPSA</Text>
                </View>
              </View>
              <Text style={[styles.upsaBadgeSubtitle, { color: colors.textMuted }]}>
                Official UPSA Student Learning Portal
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '22', borderColor: colors.error }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="e.g. Kwame Mensah"
                  placeholderTextColor={colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>UPSA Email Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="student@upsamail.edu.gh"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Password (min 8 characters)</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Create a strong password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* UPSA Faculty Picker */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Academic Faculty</Text>
              <TouchableOpacity
                style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                onPress={() => setIsFacultyModalOpen(true)}
              >
                <Ionicons name="business-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <Text
                  style={[
                    styles.input,
                    { color: selectedFaculty ? colors.textPrimary : colors.textMuted, paddingTop: 14 },
                  ]}
                  numberOfLines={1}
                >
                  {selectedFaculty ? `${selectedFaculty.name} (${selectedFaculty.code})` : 'Select UPSA Faculty'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Degree Programme */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Degree Programme</Text>
              <TouchableOpacity
                style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                onPress={() => setIsProgrammeModalOpen(true)}
              >
                <Ionicons name="book-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <Text
                  style={[
                    styles.input,
                    { color: degreeProgramme ? colors.textPrimary : colors.textMuted, paddingTop: 14 },
                  ]}
                  numberOfLines={1}
                >
                  {degreeProgramme || 'Select your accredited programme'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Year of Study */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Level / Year of Study</Text>
              <View style={styles.yearRow}>
                {[1, 2, 3, 4, 5].map((yr) => {
                  const isSelected = yearOfStudy === yr;
                  const label = yr === 5 ? 'L500+' : `L${yr * 100}`;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[
                        styles.yearBtn,
                        {
                          backgroundColor: isSelected ? colors.primaryViolet : colors.bgInput,
                          borderColor: isSelected ? colors.primaryViolet : colors.border,
                        },
                      ]}
                      onPress={() => setYearOfStudy(yr)}
                    >
                      <Text
                        style={[
                          styles.yearBtnText,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primaryViolet },
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create UPSA Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.signinLink, { color: colors.primaryViolet }]}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Faculty Modal */}
      <Modal visible={isFacultyModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select UPSA Faculty</Text>
              <TouchableOpacity onPress={() => setIsFacultyModalOpen(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={UPSA_FACULTIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.institutionItem,
                    { borderBottomColor: colors.border },
                    selectedFaculty?.code === item.code && { backgroundColor: colors.bgSubtle },
                  ]}
                  onPress={() => {
                    setSelectedFaculty(item);
                    setDegreeProgramme(item.programmes[0] || '');
                    setIsFacultyModalOpen(false);
                  }}
                >
                  <View style={styles.facultyBadge}>
                    <Text style={styles.facultyCodeText}>{item.code}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.institutionItemText, { color: colors.textPrimary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.facultySubText, { color: colors.textMuted }]}>
                      {item.programmes.length} Accredited Programmes
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Programme Modal */}
      <Modal visible={isProgrammeModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Degree Programme</Text>
              <TouchableOpacity onPress={() => setIsProgrammeModalOpen(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedFaculty ? selectedFaculty.programmes : []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.institutionItem,
                    { borderBottomColor: colors.border },
                    degreeProgramme === item && { backgroundColor: colors.bgSubtle },
                  ]}
                  onPress={() => {
                    setDegreeProgramme(item);
                    setIsProgrammeModalOpen(false);
                  }}
                >
                  <Ionicons name="ribbon-outline" size={20} color={colors.primaryViolet} style={{ marginRight: 12 }} />
                  <Text style={[styles.institutionItemText, { color: colors.textPrimary }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  upsaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  upsaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(140, 82, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  upsaBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  verifiedTag: {
    backgroundColor: '#8C52FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  upsaBadgeSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  yearBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#8C52FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  signinLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  institutionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  institutionItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  facultyBadge: {
    backgroundColor: 'rgba(140, 82, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  facultyCodeText: {
    color: '#8C52FF',
    fontSize: 12,
    fontWeight: '800',
  },
  facultySubText: {
    fontSize: 12,
    marginTop: 2,
  },
});
