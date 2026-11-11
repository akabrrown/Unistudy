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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useSettings } from '../../lib/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { forgotPassword } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();

  const handleReset = async () => {
    setErrorMessage(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid university email.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await forgotPassword(email);
      if (error) {
        setErrorMessage(error.message || 'Failed to send password reset link.');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.primaryViolet + '25' }]}>
              <Ionicons name="key-outline" size={32} color={colors.primaryViolet} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your student email and we will send you secure recovery instructions.
            </Text>
          </View>

          {errorMessage && (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '22', borderColor: colors.error }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
            </View>
          )}

          {success ? (
            <View style={[styles.successBox, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} style={{ marginBottom: 8 }} />
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Instructions Sent!</Text>
              <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                Check your inbox for a password reset email. Follow the link to create your new password.
              </Text>
              <TouchableOpacity
                style={[styles.returnBtn, { backgroundColor: colors.primaryViolet }]}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.returnBtnText}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
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

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primaryViolet }, loading && styles.submitBtnDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Send Reset Link</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
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
  successBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  returnBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
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
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
