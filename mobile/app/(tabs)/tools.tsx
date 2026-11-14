import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettings } from '../../lib/SettingsContext';
import { Ionicons } from '@expo/vector-icons';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}

export default function ToolsScreen() {
  const { colors } = useSettings();
  const router = useRouter();

  const studyTools: ToolItem[] = [
    {
      id: 'calculator',
      title: 'AI Math Calculator',
      description: 'Get instant step-by-step solutions for calculus, linear algebra, discrete math, and physics equations.',
      icon: 'calculator',
      color: '#3B82F6',
      route: '/calculator',
    },
    {
      id: 'scanner',
      title: 'Scan Notes & Whiteboard',
      description: 'Capture photos of classroom chalkboards, textbooks, or handwritten summaries to generate OCR and notes.',
      icon: 'camera',
      color: '#10B981',
      route: '/camera',
    },
    {
      id: 'essay-grader',
      title: 'AI Essay Grader',
      description: 'Upload or paste your essays to receive comprehensive rubric grading, grammar analysis, and structural advice.',
      icon: 'document-text',
      color: '#EC4899',
      route: '/essay-grader',
    },
    {
      id: 'lectures',
      title: 'Recent Lectures & Decks',
      description: 'Explore lecture slides, presentations, and structured study decks across your university courses.',
      icon: 'easel-outline',
      color: '#8C52FF',
      route: '/lectures',
    },
    {
      id: 'calendar',
      title: 'Study Calendar & Exams',
      description: 'Plan exam countdowns, assignment due dates, and study sessions with push reminders.',
      icon: 'calendar',
      color: '#F59E0B',
      route: '/study-calendar',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Study Toolkit</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            AI-powered academic tools tailored for university coursework.
          </Text>
        </View>

        {/* Tools Grid */}
        <View style={styles.toolsList}>
          {studyTools.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={[styles.toolCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => router.push(tool.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: tool.color + '20' }]}>
                <Ionicons name={tool.icon} size={28} color={tool.color} />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>{tool.title}</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
                </View>
                <Text style={[styles.toolDesc, { color: colors.textSecondary }]}>
                  {tool.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  toolsList: {
    gap: 16,
  },
  toolCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  toolDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});

