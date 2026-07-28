import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, useColorScheme, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useThemeColors } from '../constants/Colors';

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const colors = useThemeColors();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Incomplete code', 'Enter the full 6-digit code.');
      return;
    }

    setVerifying(true);

    const { error } = await supabase.auth.verifyOtp({
      email: email ?? '',
      token: code,
      type: 'signup',
    });

    if (error) {
      Alert.alert('Verification failed', error.message);
      setVerifying(false);
      return;
    }

    router.replace('/onboarding');
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email ?? '',
    });

    if (error) {
      Alert.alert('Resend failed', error.message);
    } else {
      Alert.alert('Code sent', 'A new verification code has been sent to your email.');
    }
    setResending(false);
  };

  const code = otp.join('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.iconWrap}>
        <Ionicons name="mail-outline" size={40} color={colors.tint} />
      </View>

      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.emailHighlight}>{email || 'your email'}</Text>
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            style={[
              styles.otpInput,
              digit ? styles.otpInputFilled : null,
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(v) => handleChange(i, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (verifying || code.length !== OTP_LENGTH) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={verifying || code.length !== OTP_LENGTH}
      >
        {verifying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify Email</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn't get the code? </Text>
        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text style={styles.resendLink}>{resending ? 'Sending...' : 'Resend'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDark ? 'rgba(155,114,207,0.15)' : '#EDE7F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  emailHighlight: {
    fontWeight: '600',
    color: colors.text,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: isDark ? colors.input : '#FAFAFA',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  otpInputFilled: {
    borderColor: colors.tint,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.tint,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  resendRow: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  resendLabel: {
    fontSize: 15,
    color: colors.textMuted,
  },
  resendLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.tint,
  },
});
