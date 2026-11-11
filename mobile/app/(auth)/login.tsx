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
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useSettings } from '../../lib/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
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
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.primary }]}>
              <Text style={styles.iconText}>🎓</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Welcome back to <Text style={{ color: colors.primaryViolet }}>UniStudy AI</Text>
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to access your modules, lecture slides, and AI tutor.
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
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={[styles.forgotLink, { color: colors.primaryViolet }]}>Forgot?</Text>
                  </TouchableOpacity>
                </Link>
              </View>
              <View style={[styles.inputContainer, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Enter your password"
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

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primaryViolet },
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account yet?{' '}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.signupLink, { color: colors.primaryViolet }]}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#8C52FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
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
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  forgotLink: {
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
  submitBtn: {
    height: 52,
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
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
