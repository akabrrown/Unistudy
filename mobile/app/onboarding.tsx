import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Colors, useThemeColors } from '../constants/Colors';

const LEARNING_STYLES = [
  { id: 'adaptive', label: 'Adaptive (AI decides)', icon: 'sparkles-outline' as const },
  { id: 'visual', label: 'Visual (Diagrams, charts)', icon: 'bar-chart-outline' as const },
  { id: 'reading', label: 'Reading/Writing', icon: 'book-outline' as const },
];

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
  const [learningStyle, setLearningStyle] = useState('adaptive');
  const [tutorName, setTutorName] = useState('Alex');
  const [tutorPersonality, setTutorPersonality] = useState('encouraging');
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = (nextStep: number) => {
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

    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={[styles.progressBar, step === 2 && styles.progressBarActive]} />
        <View style={[styles.progressDot, step === 2 && styles.progressActive]} />
      </View>

      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        {step === 1 ? (
          <>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.title}>Learning Style</Text>
            <Text style={styles.subtitle}>How do you learn best?</Text>

            <View style={styles.optionsGroup}>
              {LEARNING_STYLES.map(ls => (
                <TouchableOpacity
                  key={ls.id}
                  style={[styles.optionCard, learningStyle === ls.id && styles.optionCardSelected]}
                  onPress={() => setLearningStyle(ls.id)}
                >
                  <Ionicons
                    name={ls.icon}
                    size={22}
                    color={learningStyle === ls.id ? colors.tint : colors.textMuted}
                    style={{ marginRight: 14 }}
                  />
                  <Text style={[styles.optionLabel, learningStyle === ls.id && styles.optionLabelSelected]}>
                    {ls.label}
                  </Text>
                  {learningStyle === ls.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
                  )}
                </TouchableOpacity>
              ))}
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
                style={[styles.primaryButton, { flex: 1 }, saving && { opacity: 0.5 }]}
                onPress={handleComplete}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Get Started'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      {/* Skip option */}
      <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
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
    width: 80,
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
  fieldLabel: {
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
});
