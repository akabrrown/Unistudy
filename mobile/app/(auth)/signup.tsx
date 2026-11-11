import React, { useState, useEffect } from 'react';
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
import { apiFetch } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Institution {
  id: string;
  name: string;
  short_name?: string;
}

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [degreeProgramme, setDegreeProgramme] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  
  // Institutions selection
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);
  const [searchInstitution, setSearchInstitution] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signup } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();

  useEffect(() => {
    async function loadInstitutions() {
      try {
        const data = await apiFetch('/institutions');
        if (Array.isArray(data)) {
          setInstitutions(data);
        }
      } catch (e) {
        // Fallback default Ghana & international universities
        setInstitutions([
          { id: '1', name: 'University of Ghana (UG)', short_name: 'UG' },
          { id: '2', name: 'Kwame Nkrumah University of Science and Technology (KNUST)', short_name: 'KNUST' },
          { id: '3', name: 'University of Cape Coast (UCC)', short_name: 'UCC' },
          { id: '4', name: 'University of Professional Studies, Accra (UPSA)', short_name: 'UPSA' },
          { id: '5', name: 'Ghana Institute of Management and Public Administration (GIMPA)', short_name: 'GIMPA' },
          { id: '6', name: 'Ashesi University', short_name: 'Ashesi' },
        ]);
      }
    }
    loadInstitutions();
  }, []);

  const handleSignup = async () => {
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid university email address.');
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
        institutionId: selectedInstitution?.id,
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

  const filteredInstitutions = institutions.filter(inst =>
    inst.name.toLowerCase().includes(searchInstitution.toLowerCase()) ||
    (inst.short_name && inst.short_name.toLowerCase().includes(searchInstitution.toLowerCase()))
  );

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
              Join your university peers and elevate your study materials with AI.
            </Text>
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
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>University Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="student@university.edu"
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

            {/* Institution Picker Trigger */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Institution / University</Text>
              <TouchableOpacity
                style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                onPress={() => setIsInstitutionModalOpen(true)}
              >
                <Ionicons name="school-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <Text
                  style={[
                    styles.input,
                    { color: selectedInstitution ? colors.textPrimary : colors.textMuted, paddingTop: 14 },
                  ]}
                  numberOfLines={1}
                >
                  {selectedInstitution ? selectedInstitution.name : 'Select your university'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Degree Programme */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Degree Programme</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="book-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="e.g. BSc Computer Science"
                  placeholderTextColor={colors.textMuted}
                  value={degreeProgramme}
                  onChangeText={setDegreeProgramme}
                />
              </View>
            </View>

            {/* Year of Study */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Year of Study</Text>
              <View style={styles.yearRow}>
                {[1, 2, 3, 4, 5, 6].map((yr) => {
                  const isSelected = yearOfStudy === yr;
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
                        Yr {yr}
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
                <Text style={styles.submitBtnText}>Create Account</Text>
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

      {/* Institution Selection Modal */}
      <Modal visible={isInstitutionModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Institution</Text>
              <TouchableOpacity onPress={() => setIsInstitutionModalOpen(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.textPrimary }]}
                placeholder="Search university..."
                placeholderTextColor={colors.textMuted}
                value={searchInstitution}
                onChangeText={setSearchInstitution}
              />
            </View>
            <FlatList
              data={filteredInstitutions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.institutionItem,
                    { borderBottomColor: colors.border },
                    selectedInstitution?.id === item.id && { backgroundColor: colors.bgSubtle },
                  ]}
                  onPress={() => {
                    setSelectedInstitution(item);
                    setIsInstitutionModalOpen(false);
                  }}
                >
                  <Ionicons name="school" size={20} color={colors.primaryViolet} style={{ marginRight: 12 }} />
                  <Text style={[styles.institutionItemText, { color: colors.textPrimary }]}>
                    {item.name}
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
    marginBottom: 24,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  form: {
    gap: 16,
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
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  yearBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
    fontSize: 16,
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
    backgroundColor: 'rgba(0,0,0,0.65)',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  institutionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  institutionItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
