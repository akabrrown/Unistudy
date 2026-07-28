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

export default function SignupScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

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

  const canProceedStep1 = username.length >= 3 && usernameAvailable === true && name.trim().length > 0 && email.includes('@') && email.includes('.') && passwordStrength.score >= 2;

  const handleSignup = async () => {
    if (!canProceedStep1) {
      let msg = '';
      if (username.length < 3) msg = 'Username must be at least 3 characters.';
      else if (usernameAvailable !== true) msg = 'Pick an available username.';
      else if (!name.trim()) msg = 'Full name is required.';
      else if (!email.includes('@') || !email.includes('.')) msg = 'Enter a valid email address.';
      else if (passwordStrength.score < 2) msg = 'Password is too weak. Use at least 6 characters with mixed case and a number.';
      Alert.alert('Missing info', msg);
      return;
    }
    const leaked = await isPasswordLeaked(password);
    if (leaked) {
      Alert.alert('Unsafe password', 'This password appears in known data breaches. Choose a different password.');
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
      // Supabase email confirmation is enabled — user needs to verify OTP
      router.replace({ pathname: '/verify', params: { email } });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Set up your profile to get started.
          </Text>
        </View>

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
                placeholder=""
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
                placeholder="example@gmail.com"
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
                placeholder="Min. 6 characters"
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
              style={[styles.primaryButton, (!canProceedStep1 || loading) && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={!canProceedStep1 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>


        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.footerLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>


    </KeyboardAvoidingView>
  );
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#888' };
  let score = 0;
  if (pw.length >= 6) score++;
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
