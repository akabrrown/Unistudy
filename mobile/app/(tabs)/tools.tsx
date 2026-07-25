import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, useThemeColors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';

export default function ToolsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const router = useRouter();
  
  const tools = [
    {
      id: 'past-papers',
      title: 'Past Papers',
      description: 'Access past exam questions and practice materials',
      icon: 'document-text',
      color: isDark ? '#1A237E' : '#E3F2FD',
      iconColor: isDark ? '#90CAF9' : '#1976D2',
    },
    {
      id: 'study-calendar',
      title: 'Study Calendar',
      description: 'Plan your study sessions and track upcoming exams',
      icon: 'calendar',
      color: isDark ? '#004D40' : '#E0F2F1',
      iconColor: isDark ? '#80CBC4' : '#00796B',
    },
    {
      id: 'notes-scanner',
      title: 'Notes Scanner',
      description: 'Scan handwritten notes and digitize them with AI',
      icon: 'scan',
      color: isDark ? '#3E2723' : '#EFEBE9',
      iconColor: isDark ? '#D7CCC8' : '#795548',
    },
    {
      id: 'essay-grader',
      title: 'Essay Grader',
      description: 'Get instant feedback and grading on your essays',
      icon: 'pencil',
      color: isDark ? '#311B92' : '#EDE7F6',
      iconColor: isDark ? '#B39DDB' : '#6b21a8',
    },
    {
      id: 'youtube-study',
      title: 'YouTube Study',
      description: 'Watch educational videos without distractions',
      icon: 'logo-youtube',
      color: isDark ? '#4A0E0E' : '#FFEBEE',
      iconColor: isDark ? '#EF5350' : '#C62828',
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.headerTitle}>Study Tools</Text>
      <Text style={styles.description}>
        Everything you need to study effectively in one place.
      </Text>

      <View style={styles.toolsGrid}>
        {tools.map((tool) => (
          <TouchableOpacity 
            key={tool.id} 
            style={styles.toolCard}
            onPress={() => {
              router.push(`/${tool.id}`);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: tool.color }]}>
              <Ionicons name={tool.icon as any} size={28} color={tool.iconColor} />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'inter',
  },
  description: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 24,
    fontFamily: 'inter',
  },
  toolsGrid: {
    gap: 16,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolInfo: {
    flex: 1,
    marginRight: 16,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'inter',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: 'inter',
    lineHeight: 20,
  },
});
